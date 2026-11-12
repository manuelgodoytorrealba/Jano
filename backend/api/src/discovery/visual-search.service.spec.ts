import sharp from 'sharp';
import { VisualSearchService } from './visual-search.service';
import { VISUAL_VERSION } from './image-features';
describe('private visual queries', () => {
  it('binds references to their owner and expires/removes them', async () => {
    const service = new VisualSearchService();
    jest.spyOn(service, 'analyze').mockResolvedValue({
      version: VISUAL_VERSION,
      hash: 'hash',
      embedding: Array(512).fill(0.1),
      palette: [],
    });
    const result = await service.createQuery(Buffer.from('photo'), 'owner-a');
    expect(service.getQuery(result.id, 'owner-a').embedding).toHaveLength(512);
    expect(() => service.getQuery(result.id, 'owner-b')).toThrow();
    service.removeQuery(result.id, 'owner-b');
    expect(() => service.getQuery(result.id, 'owner-a')).not.toThrow();
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 60 * 1000);
    expect(() => service.getQuery(result.id, 'owner-a')).toThrow();
    now.mockRestore();
    const second = await service.createQuery(Buffer.from('photo'), 'owner-a');
    service.removeQuery(second.id, 'owner-a');
    expect(() => service.getQuery(second.id, 'owner-a')).toThrow();
  });
  it('uses a configured vision model as optional, untrusted reading and survives invalid output', async () => {
    const previous = process.env.VISUAL_SEARCH_VISION_MODEL;
    process.env.VISUAL_SEARCH_VISION_MODEL = 'test-vision';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          description: 'Figuras en círculo',
          visibleText: '',
          searchTerms: ['danza', 4, 'x'.repeat(101)],
        }),
      }),
    } as Response);
    try {
      const service = new VisualSearchService();
      jest.spyOn(service, 'analyze').mockResolvedValue({
        version: VISUAL_VERSION,
        hash: 'hash',
        embedding: Array(512).fill(0.1),
        palette: [],
      });
      const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
        .jpeg()
        .toBuffer();
      const first = await service.createQuery(bytes, 'owner');
      expect(service.getQuery(first.id, 'owner').terms).toEqual(['danza']);
      expect(first.description).toBe('Figuras en círculo');
      const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
      expect(body.model).toBe('test-vision');
      expect(body.images).toHaveLength(1);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'invalid JSON' }),
      } as Response);
      const second = await service.createQuery(bytes, 'owner');
      expect(second.description).toBeNull();
      expect(service.getQuery(second.id, 'owner').embedding).toHaveLength(512);
    } finally {
      fetchMock.mockRestore();
      if (previous === undefined) delete process.env.VISUAL_SEARCH_VISION_MODEL;
      else process.env.VISUAL_SEARCH_VISION_MODEL = previous;
    }
  });
});
