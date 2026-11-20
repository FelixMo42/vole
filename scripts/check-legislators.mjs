import { readFile } from 'node:fs/promises';
import { chambers, validateDataset } from './lib/legislators.mjs';

for (const config of Object.values(chambers)) {
  const dataset = JSON.parse(
    await readFile(new URL(`../data/${config.file}`, import.meta.url), 'utf8'),
  );
  validateDataset(dataset);
  console.log(
    `${config.title}: ${dataset.memberCount} members + ${dataset.vacancyCount} vacancies = ${dataset.seatCount} districts verified`,
  );
}
