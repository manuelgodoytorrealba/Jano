async page => {
  const rows = [];
  const expected = {
    cuerpo: { es: 'En prácticas artísticas', en: 'In artistic practices' },
    'edificio-bauhaus-dessau': { es: 'Cuando la Bauhaus se trasladó', en: 'When the Bauhaus moved' },
    divisor: { es: 'La fuente caracteriza Divisor', en: 'The source characterizes Divisor' },
    'faces-and-phases': { es: 'El registro de The Walther Collection', en: 'The Walther Collection record' },
  };
  for (const slug of Object.keys(expected)) {
    await page.goto('http://localhost:4200/entity/' + slug);
    await page.locator('.entity-story .rt').waitFor();
    for (const locale of ['es', 'en', 'es']) {
      const label = locale === 'es' ? 'Switch to Spanish' : 'Cambiar a inglés';
      const button = page.getByRole('button', { name: label, exact: true });
      if (await button.count()) await button.click();
      const story = page.locator('.entity-story');
      await story.locator('.rt').getByText(expected[slug][locale], { exact: false }).waitFor();
      const rendered = await story.innerText();
      if (!rendered.includes(expected[slug][locale])) throw new Error(`language/text ${slug} ${locale}`);
      if (/\bJANO\b|\\[nrt]|this entity|la ficha/i.test(rendered)) throw new Error(`meta ${slug} ${locale}`);
      if (await story.locator('a[href="/entity/' + slug + '"]').count()) throw new Error(`self-link ${slug}`);
      await story.screenshot({ path: `output/playwright/recovery-${slug}-${locale}.png` });
      rows.push({ slug, locale, result: 'PASS' });
    }
  }
  console.log(JSON.stringify(rows));
}
