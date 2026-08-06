import { textFromHtml } from './library-material-preparation.service';

describe('textFromHtml', () => {
  it('keeps article text readable and decodes its HTML entities', () => {
    expect(
      textFromHtml(
        '<nav>Menú</nav><article><p>La m&aacute;quina &laquo;lee&raquo;.</p><p>Segunda parte.</p></article>',
      ),
    ).toBe('La máquina «lee».\nSegunda parte.');
  });
});
