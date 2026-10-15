import { describe, expect, it } from 'vitest';
import { externalSourceLink } from './entity-detail.presenter';

describe('external source links', () => {
  it('preserves the original page, query and fragment while showing its domain', () => {
    expect(externalSourceLink(' https://www.museum.org/collection/work?id=42#references ')).toEqual(
      {
        href: 'https://www.museum.org/collection/work?id=42#references',
        domain: 'museum.org',
      },
    );
    expect(externalSourceLink('http://archive.org/item')).toEqual({
      href: 'http://archive.org/item',
      domain: 'archive.org',
    });
  });

  it('leaves missing, malformed and non-web references as plain citations', () => {
    for (const value of [
      undefined,
      null,
      '',
      ' ',
      'not a URL',
      '/collection',
      '//museum.org',
      'javascript:alert(1)',
      'data:text/html,test',
      'mailto:archive@museum.org',
      'https://user:password@museum.org',
    ]) {
      expect(externalSourceLink(value)).toBeNull();
    }
  });
});
