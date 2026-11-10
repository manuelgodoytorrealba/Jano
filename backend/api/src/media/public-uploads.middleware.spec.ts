import express from 'express';
import request from 'supertest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publicUploadsOnly } from './public-uploads.middleware';

describe('public uploads boundary', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'jano-public-uploads-'));
    await mkdir(join(root, 'research'));
    await writeFile(join(root, 'research', 'private.txt'), 'private fixture');
    await writeFile(join(root, 'public.txt'), 'public fixture');
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('blocks encoded private paths before static serving while preserving public files', async () => {
    const app = express();
    app.use('/uploads', publicUploadsOnly, express.static(root));
    for (const path of [
      '/research/private.txt',
      '/%72esearch/private.txt',
      '/research%2Fprivate.txt',
      '/%2Fresearch/private.txt',
      '/media%2F..%2Fresearch/private.txt',
      '/%5Cresearch%5Cprivate.txt',
    ]) {
      await request(app)
        .get('/uploads' + path)
        .expect(404);
    }
    await request(app).get('/uploads/public.txt').expect(200, 'public fixture');
    await request(app).get('/uploads/%ZZ').expect(400);
  });
});
