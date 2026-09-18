async (page) => {
  const results = [];
  await page.setViewportSize({width: 1365, height: 1000});
  for (const slug of ['romanticismo', 'neoclasicismo']) {
    await page.goto('http://localhost:4200/entity/' + slug);
    await page.locator('.entity-story .rt').waitFor();
    for (const locale of ['es', 'en', 'es']) {
      const label = locale === 'es' ? 'Switch to Spanish' : 'Cambiar a inglés';
      const button = page.getByRole('button', {name: label, exact: true});
      if (await button.count()) await button.click();
      const heading = slug === 'romanticismo'
        ? (locale === 'es' ? 'Sentimiento y naturaleza' : 'Feeling and nature')
        : (locale === 'es' ? 'El interés por la Antigüedad' : 'Interest in antiquity');
      await page.getByRole('heading', {name: heading, exact: true}).waitFor();
      const story = page.locator('.entity-story');
      const prose = await story.innerText();
      const expected = slug === 'romanticismo'
        ? (locale === 'es' ? 'El Romanticismo es un movimiento artístico y literario' : 'Romanticism is an artistic and literary movement')
        : (locale === 'es' ? 'El Neoclasicismo fue una forma especialmente depurada' : 'Neoclassicism was a particularly pure form');
      if (!prose.includes(expected)) throw new Error('Missing refreshed summary: ' + slug + locale);
      if (/\bJANO\b|\\[nrt]|this entity|la ficha/.test(prose)) throw new Error('Meta or escape');
      if (await story.locator('a[href="/entity/' + slug + '"]').count()) throw new Error('Self link');
      if (slug === 'romanticismo' && await story.locator('a[href="/entity/naturaleza"]').count() !== 1) throw new Error('Missing rich link');
      await story.screenshot({path: 'output/playwright/recovery-' + slug + '-' + locale + '.png'});
      results.push({slug, locale, heading, rendered_text: prose, result: 'PASS'});
    }
  }
  console.log(JSON.stringify(results));
}
