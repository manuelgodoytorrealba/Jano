import { Injectable } from '@nestjs/common';
import { LibraryMaterialKind, LibraryMaterialVersionStatus } from '@prisma/client';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { isIP } from 'node:net';
import { join, normalize, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';

const execFileAsync = promisify(execFile);
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

function isPrivateAddress(address: string) {
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd')) return true;
  const parts = address.split('.').map(Number);
  return (
    parts.length === 4 &&
    (parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0)
  );
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  laquo: '«',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  reg: '®',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Ntilde: 'Ñ',
  Oacute: 'Ó',
  Uacute: 'Ú',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  ntilde: 'ñ',
  oacute: 'ó',
  uacute: 'ú',
  Auml: 'Ä',
  Euml: 'Ë',
  Iuml: 'Ï',
  Ouml: 'Ö',
  Uuml: 'Ü',
  auml: 'ä',
  euml: 'ë',
  iuml: 'ï',
  ouml: 'ö',
  uuml: 'ü',
  iquest: '¿',
  iexcl: '¡',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const point = Number.parseInt(
        code.slice(code[1].toLowerCase() === 'x' ? 2 : 1),
        code[1].toLowerCase() === 'x' ? 16 : 10,
      );
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    }
    return HTML_ENTITIES[code] ?? entity;
  });
}

export function textFromHtml(value: string) {
  const main =
    value.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] ?? value;
  return decodeHtmlEntities(main)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:header|nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:header|nav|footer|aside)>/gi, ' ')
    .replace(/<\/?(?:p|h[1-6]|li|blockquote|figcaption|br)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Injectable()
export class LibraryMaterialPreparationService {
  constructor(private readonly prisma: PrismaService) {}

  async prepare(materialVersionId: string) {
    const version = await this.prisma.libraryMaterialVersion.findUnique({
      where: { id: materialVersionId },
      select: { id: true, url: true, storageKey: true, material: { select: { kind: true } } },
    });
    if (!version) throw new Error('Library material version not found');

    const content =
      version.material.kind === LibraryMaterialKind.PDF
        ? await this.extractPdf(version.storageKey)
        : version.material.kind === LibraryMaterialKind.URL
          ? await this.fetchUrl(version.url)
          : null;
    if (!content) throw new Error('Document preparation produced no readable text');

    await this.prisma.libraryMaterialVersion.update({
      where: { id: version.id },
      data: {
        content,
        contentHash: createHash('sha256').update(content).digest('hex'),
        status: LibraryMaterialVersionStatus.READY,
      },
    });
  }

  async markFailed(materialVersionId: string) {
    await this.prisma.libraryMaterialVersion.update({
      where: { id: materialVersionId },
      data: { status: LibraryMaterialVersionStatus.FAILED },
    });
  }

  private async extractPdf(storageKey: string | null) {
    if (!storageKey) throw new Error('PDF storage is unavailable');
    const uploads = join(process.cwd(), 'uploads');
    const path = normalize(join(uploads, storageKey));
    if (relative(uploads, path).startsWith('..')) throw new Error('Invalid PDF storage path');
    const { stdout } = await execFileAsync('pdftotext', ['-enc', 'UTF-8', path, '-'], {
      maxBuffer: MAX_DOCUMENT_BYTES,
      timeout: FETCH_TIMEOUT_MS,
    });
    const extracted = stdout.trim();
    return extracted || this.ocrPdf(path);
  }

  private async ocrPdf(path: string) {
    const directory = await mkdtemp(join(tmpdir(), 'jano-ocr-'));
    const prefix = join(directory, 'page');
    try {
      await execFileAsync('pdftoppm', ['-f', '1', '-l', '20', '-r', '150', '-jpeg', path, prefix], {
        timeout: 120_000,
      });
      const pages = (await readdir(directory)).filter((file) => file.endsWith('.jpg')).sort();
      const text = await Promise.all(
        pages.map(async (page) => {
          const { stdout } = await execFileAsync(
            'tesseract',
            [join(directory, page), 'stdout', '-l', 'spa+eng'],
            {
              maxBuffer: MAX_DOCUMENT_BYTES,
              timeout: FETCH_TIMEOUT_MS,
            },
          );
          return stdout.trim();
        }),
      );
      return text.filter(Boolean).join('\n\n').trim();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async fetchUrl(rawUrl: string | null) {
    if (!rawUrl) throw new Error('URL is unavailable');
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Only public HTTP(S) URLs can be prepared');
    }
    if (isIP(url.hostname) && isPrivateAddress(url.hostname))
      throw new Error('Private URL is blocked');
    const address = await lookup(url.hostname);
    if (isPrivateAddress(address.address)) throw new Error('Private URL is blocked');

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error',
      headers: { Accept: 'text/html,text/plain;q=0.9' },
    });
    if (!response.ok) throw new Error(`URL returned HTTP ${response.status}`);
    const type = response.headers.get('content-type') ?? '';
    if (!/^(text\/html|text\/plain)/i.test(type))
      throw new Error('URL did not return HTML or text');
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_DOCUMENT_BYTES) throw new Error('URL content exceeds 5 MB');
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_DOCUMENT_BYTES) throw new Error('URL content exceeds 5 MB');
    return type.toLowerCase().startsWith('text/html') ? textFromHtml(text) : text.trim();
  }
}
