import { contentIdentity, materialIdentity, versionAction } from './library-material-identity';

describe('library material identity', () => {
  it('reuses the same material identity for the same Source and canonical URL', () => {
    expect(materialIdentity('source-1', 'URL', 'https://example.org/a')).toBe(
      materialIdentity('source-1', 'URL', 'https://example.org/a'),
    );
    expect(materialIdentity('source-1', 'URL', 'https://example.org/a')).not.toBe(
      materialIdentity('source-2', 'URL', 'https://example.org/a'),
    );
  });

  it('does not create a version for identical content, but does for changed content', () => {
    const hash = contentIdentity('same documentary text');
    expect(versionAction(hash, 'same documentary text')).toBe('REUSE_VERSION');
    expect(versionAction(hash, 'changed documentary text')).toBe('CREATE_VERSION');
  });
});
