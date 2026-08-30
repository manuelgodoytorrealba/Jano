import { textFromHtml } from './library-material-preparation.service';

describe('textFromHtml', () => {
  it('keeps article text readable and decodes its HTML entities', () => {
    expect(
      textFromHtml(
        '<nav>Menú</nav><article><p>La m&aacute;quina &laquo;lee&raquo;.</p><p>Segunda parte.</p></article>',
      ),
    ).toBe('La máquina «lee».\nSegunda parte.');
  });

  it('removes common cookie, breadcrumb and related-content chrome', () => {
    expect(
      textFromHtml(
        '<main><div class="cookie-banner">Accept cookies</div><div class="breadcrumb">Home</div><h1>Título</h1><p>Contenido sustantivo.</p><aside class="related">Related</aside></main>',
      ),
    ).toBe('Título\nContenido sustantivo.');
  });
});
