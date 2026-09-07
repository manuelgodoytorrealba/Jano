import { Injectable } from '@nestjs/common';
import { LibraryMaterialKind, LibraryMaterialVersionStatus } from '@prisma/client';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join, normalize, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { SourceAcquisition } from './source-acquisition';
import {
  AcquisitionCandidate,
  normalizeSourceUrl,
  contentRoute,
} from './source-acquisition-policy';
import { PrismaService } from '../prisma/prisma.service';

const execFileAsync = promisify(execFile);
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
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
    .replace(
      /<(?:header|nav|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/(?:header|nav|footer|aside|form|dialog)>/gi,
      ' ',
    )
    .replace(
      /<([a-z0-9]+)\b[^>]*(?:cookie|breadcrumb|related|share|social|subscribe|newsletter|advert|banner)[^>]*>[\s\S]*?<\/\1>/gi,
      ' ',
    )
    .replace(/<\/?(?:p|h[1-6]|li|blockquote|figcaption|br)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Injectable()
export class LibraryMaterialPreparationService {
  private readonly acquisition = new SourceAcquisition();
  constructor(private readonly prisma: PrismaService) {}

  async prepare(materialVersionId: string) {
    const version = await this.prisma.libraryMaterialVersion.findUnique({
      where: { id: materialVersionId },
      select: {
        id: true,
        url: true,
        storageKey: true,
        status: true,
        content: true,
        material: { select: { kind: true, title: true, source: { select: { publisher: true } } } },
      },
    });
    if (!version) throw new Error('Library material version not found');

    if (version.status === LibraryMaterialVersionStatus.READY && version.content?.trim()) return;
    const content =
      version.material.kind === LibraryMaterialKind.PDF && version.storageKey
        ? await this.extractPdf(version.storageKey)
        : version.material.kind === LibraryMaterialKind.URL ||
            version.material.kind === LibraryMaterialKind.PDF
          ? await this.fetchUrl(
              version.url,
              version.id,
              version.material.title,
              version.material.source?.publisher ?? null,
            )
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

  /** Batch acquisition entry: alternative documents retain their own Source and version. */
  async acquireSource(candidate: AcquisitionCandidate, wave: string) {
    const cached = async () =>
      this.prisma.libraryMaterialVersion
        .findFirst({
          where: {
            url: normalizeSourceUrl(candidate.url),
            status: LibraryMaterialVersionStatus.READY,
            content: { not: null },
          },
          select: { id: true, materialId: true, content: true },
        })
        .then((v) => (v?.content?.trim() ? { versionId: v.id, materialId: v.materialId } : null));
    return this.acquisition.resolve(
      candidate,
      wave,
      async (access, actualSource) => {
        const url = normalizeSourceUrl(actualSource.url);
        const version = await this.prisma.$transaction(async (tx) => {
          // Serialize Source/version reuse across workers without adding a second identity table.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${url}))`;
          let source = await tx.source.findFirst({ where: { url }, orderBy: { createdAt: 'asc' } });
          source ??= await tx.source.create({
            data: {
              type: 'ARTICLE',
              url,
              title: actualSource.title,
              publisher: actualSource.publisher,
            },
          });
          let material = await tx.libraryMaterial.findFirst({
            where: { sourceId: source.id },
            orderBy: { createdAt: 'asc' },
          });
          material ??= await tx.libraryMaterial.create({
            data: {
              sourceId: source.id,
              title: actualSource.title,
              kind: contentRoute(access.mime) === 'PDF' ? 'PDF' : 'URL',
            },
          });
          const storageKey = relative(join(process.cwd(), 'uploads'), access.bodyPath!);
          const same = await tx.libraryMaterialVersion.findFirst({
            where: { materialId: material.id, storageKey },
          });
          if (same) return same;
          const last = await tx.libraryMaterialVersion.aggregate({
            where: { materialId: material.id },
            _max: { version: true },
          });
          return tx.libraryMaterialVersion.create({
            data: {
              materialId: material.id,
              version: (last._max.version ?? 0) + 1,
              url,
              mimeType: access.mime,
              storageKey,
              sizeBytes: access.size,
              originalName: actualSource.title,
              status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
            },
          });
        });
        await this.prepare(version.id);
        let pageCount: number | null = null;
        if (contentRoute(access.mime) === 'PDF') {
          const info = await execFileAsync('pdfinfo', [access.bodyPath!], {
            timeout: FETCH_TIMEOUT_MS,
          }).catch(() => null);
          pageCount = Number(info?.stdout.match(/^Pages:\s+(\d+)/m)?.[1]) || null;
        }
        this.acquisition.write(`version:${version.id}`, {
          versionId: version.id,
          requestedUrl: candidate.url,
          acquiredSourceUrl: actualSource.url,
          finalUrl: access.finalUrl,
          publisher: actualSource.publisher,
          title: actualSource.title,
          retrievedAt: access.retrievedAt,
          mime: access.mime,
          documentHash: access.documentHash,
          pageCount,
        });
        return { versionId: version.id, materialId: version.materialId };
      },
      cached,
    );
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

  private async fetchUrl(
    rawUrl: string | null,
    versionId: string,
    title: string,
    publisher: string | null,
  ) {
    if (!rawUrl) throw new Error('URL is unavailable');
    const result = await this.acquisition.download(rawUrl);
    if (!result.bodyPath || !result.state.startsWith('ACCESSIBLE'))
      throw new Error(
        `Acquisition ${result.state}: HTTP ${result.status}; ${result.error ?? 'manual or alternate source required'}`,
      );
    const bytes = this.acquisition.body(result);
    const route = contentRoute(result.mime);
    let content: string;
    if (route === 'PDF') {
      // Acquisition stores the original before the existing PDF/OCR preparator reads it.
      content = await this.extractPdf(relative(join(process.cwd(), 'uploads'), result.bodyPath));
    } else if (route === 'JSON') {
      // Structured reference stays visibly structured; never manufacture documentary paragraphs.
      content = JSON.stringify(JSON.parse(bytes.toString('utf8')), null, 2);
    } else
      content =
        route === 'HTML' ? textFromHtml(bytes.toString('utf8')) : bytes.toString('utf8').trim();
    await this.prisma.libraryMaterialVersion.update({
      where: { id: versionId },
      data: {
        mimeType: result.mime,
        sizeBytes: bytes.length,
        storageKey: relative(join(process.cwd(), 'uploads'), result.bodyPath),
      },
    });
    let pageCount: number | null = null;
    if (route === 'PDF') {
      const info = await execFileAsync('pdfinfo', [result.bodyPath], {
        timeout: FETCH_TIMEOUT_MS,
      }).catch(() => null);
      pageCount = Number(info?.stdout.match(/^Pages:\s+(\d+)/m)?.[1]) || null;
    }
    this.acquisition.write(`version:${versionId}`, {
      versionId,
      title,
      publisher,
      requestedUrl: rawUrl,
      finalUrl: result.finalUrl,
      retrievedAt: result.retrievedAt,
      mime: result.mime,
      documentHash: result.documentHash,
      pageCount,
    });
    return content;
  }
}
