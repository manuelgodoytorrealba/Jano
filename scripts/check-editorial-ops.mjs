import { readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const repositoryRoot = new URL('..', import.meta.url);
const scriptsDirectory = new URL('../backend/api/scripts/', import.meta.url);
const backendPackage = JSON.parse(
  readFileSync(new URL('../backend/api/package.json', import.meta.url), 'utf8'),
);

const files = readdirSync(scriptsDirectory)
  .filter((name) => statSync(new URL(name, scriptsDirectory)).isFile())
  .filter((name) => ['.cjs', '.js', '.ts'].some((extension) => name.endsWith(extension)))
  .sort();
const packageCommands = Object.values(backendPackage.scripts).join('\n');
const directlyInvoked = [
  ...packageCommands.matchAll(/(?:^|\s)scripts\/([\w.-]+\.(?:cjs|js|ts))/g),
].map((match) => match[1]);
const compiledSources = [...packageCommands.matchAll(/(?:^|\s)dist\/scripts\/([\w.-]+)\.js/g)].map(
  (match) => `${match[1]}.ts`,
);
const supportedNames = new Set([...directlyInvoked, ...compiledSources]);

const catalog = {
  supported: [],
  fixtures: [],
  historical: [],
  manual: [],
};

for (const name of files) {
  if (supportedNames.has(name)) {
    catalog.supported.push(name);
  } else if (name.endsWith('fixture.test.cjs')) {
    catalog.fixtures.push(name);
  } else if (name.endsWith('.cjs') || name.endsWith('-browser.js')) {
    catalog.historical.push(name);
  } else {
    catalog.manual.push(name);
  }
}

const missingCommands = [...supportedNames].filter((name) => !files.includes(name));

if (missingCommands.length > 0) {
  console.error(`Package commands reference missing scripts: ${missingCommands.join(', ')}`);
  process.exitCode = 1;
}

for (const name of files.filter((file) => file.endsWith('.cjs') || file.endsWith('.js'))) {
  const syntaxCheck = spawnSync(
    process.execPath,
    ['--check', new URL(name, scriptsDirectory).pathname],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  );
  if (syntaxCheck.status !== 0) {
    console.error(`Script does not parse: ${name}`);
    console.error(syntaxCheck.stderr);
    process.exitCode = 1;
  }
}

console.log(
  [
    `Editorial operations catalog: ${files.length} scripts`,
    `supported=${catalog.supported.length}`,
    `manual=${catalog.manual.length}`,
    `fixtures=${catalog.fixtures.length}`,
    `historical=${catalog.historical.length}`,
  ].join(' | '),
);
