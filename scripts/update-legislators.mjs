import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { chambers, buildDataset } from './lib/legislators.mjs';

const { values } = parseArgs({
  options: {
    'senate-html': { type: 'string' },
    'assembly-html': { type: 'string' },
  },
});
const retrievedAt = new Date().toISOString();

async function readSource(chamber, config) {
  const file = values[`${chamber}-html`];
  if (file) return readFile(file, 'utf8');
  const response = await fetch(config.url, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${config.url}: HTTP ${response.status}`);
  return response.text();
}

// Fetch and validate both rosters before replacing either checked-in dataset.
const datasets = await Promise.all(
  Object.entries(chambers).map(async ([chamber, config]) => {
    const html = await readSource(chamber, config);
    const dataset = buildDataset(chamber, html, retrievedAt);
    return { config, dataset };
  }),
);
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
for (const { config, dataset } of datasets) {
  await writeFile(
    new URL(`../data/${config.file}`, import.meta.url),
    JSON.stringify(dataset, null, 2) + '\n',
  );
  console.log(
    `${config.title}: ${dataset.memberCount} members, ${dataset.vacancyCount} vacancies`,
  );
}
