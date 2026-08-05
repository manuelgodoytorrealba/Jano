import { BadRequestException } from '@nestjs/common';
import {
  RESEARCH_PDF_MAX_SIZE_BYTES,
  RESEARCH_PDF_UPLOAD_OPTIONS,
} from './research-pdf-upload.config';

describe('Research PDF upload configuration', () => {
  it('sets the PDF upload limit to 300 MiB', () => {
    expect(RESEARCH_PDF_UPLOAD_OPTIONS.limits.fileSize).toBe(RESEARCH_PDF_MAX_SIZE_BYTES);
    expect(RESEARCH_PDF_MAX_SIZE_BYTES).toBe(300 * 1024 * 1024);
  });

  it('rejects a non-PDF upload before the writer runs', () => {
    const callback = jest.fn();

    RESEARCH_PDF_UPLOAD_OPTIONS.fileFilter(
      {},
      { mimetype: 'image/png', originalname: 'catalogo.png' },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });
});
