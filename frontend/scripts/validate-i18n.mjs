import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '../src/assets/i18n');

async function readLocale(locale) {
  const filePath = path.join(i18nDir, `${locale}.json`);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function diffKeys(base, target) {
  const baseKeys = new Set(Object.keys(base));
  const targetKeys = new Set(Object.keys(target));

  return {
    missingInTarget: [...baseKeys].filter((key) => !targetKeys.has(key)).sort(),
    missingInBase: [...targetKeys].filter((key) => !baseKeys.has(key)).sort(),
  };
}

const [es, en] = await Promise.all([readLocale('es'), readLocale('en')]);
const { missingInTarget, missingInBase } = diffKeys(es, en);
const emptyValues = Object.entries({ es, en }).flatMap(([locale, dictionary]) =>
  Object.entries(dictionary)
    .filter(([, value]) => typeof value !== 'string' || !value.trim())
    .map(([key]) => `${locale}:${key}`),
);

if (missingInTarget.length || missingInBase.length || emptyValues.length) {
  console.error('i18n validation failed.');

  if (missingInTarget.length) {
    console.error('\nMissing in en.json:');
    for (const key of missingInTarget) {
      console.error(`- ${key}`);
    }
  }

  if (missingInBase.length) {
    console.error('\nMissing in es.json:');
    for (const key of missingInBase) {
      console.error(`- ${key}`);
    }
  }

  if (emptyValues.length) {
    console.error('\nEmpty translation values:');
    for (const entry of emptyValues) console.error(`- ${entry}`);
  }

  process.exit(1);
}

console.log('i18n validation passed.');
