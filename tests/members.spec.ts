import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { LegislatorDataset } from '../data/types';

const chambers = [
  {
    page: 'state-senate',
    file: 'california-senators',
    accentQuery: 'arreguin',
    accentName: 'Jesse Arreguín',
  },
  {
    page: 'state-assembly',
    file: 'california-assembly-members',
    accentQuery: 'avila',
    accentName: 'Anamarie Ávila Farías',
  },
];

for (const chamber of chambers) {
  test(`${chamber.page}: search members by name, district, party, and accents`, async ({
    page,
  }) => {
    const dataset: LegislatorDataset = JSON.parse(
      await readFile(`data/${chamber.file}.json`, 'utf8'),
    );
    await page.goto(`/${chamber.page}.html`);
    const input = page.getByRole('searchbox', { name: 'Search members' });
    const rows = page.locator('tbody tr:visible');
    const status = page.getByRole('status');
    const clear = page.getByRole('button', { name: 'Clear', exact: true });
    await expect(input).toBeVisible();
    await expect(rows).toHaveCount(dataset.members.length);
    await expect(
      page.getByRole('columnheader', { name: 'Next election' }),
    ).toBeVisible();
    const electionYear = dataset.members[0]!.nextElectionYear;
    await input.fill(String(electionYear));
    await expect(rows).toHaveCount(
      dataset.members.filter(
        (member) => member.nextElectionYear === electionYear,
      ).length,
    );
    await input.fill(`${electionYear} republican`);
    await expect(rows).toHaveCount(
      dataset.members.filter(
        (member) =>
          member.nextElectionYear === electionYear &&
          member.party === 'Republican',
      ).length,
    );
    await input.fill('1900');
    await expect(rows).toHaveCount(0);

    await input.fill('republican');
    const republicans = dataset.members.filter(
      (member) => member.party === 'Republican',
    );
    await expect(rows).toHaveCount(republicans.length);
    await expect(status).toHaveText(
      `${republicans.length} of ${dataset.members.length} members`,
    );

    await input.fill('district 1');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(
      dataset.members.find((member) => member.district === 1)!.name,
    );

    await input.fill(`  ${chamber.accentQuery.toUpperCase()}  `);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(chamber.accentName);
    const member = dataset.members.find(
      (item) => item.name === chamber.accentName,
    )!;
    await expect(rows.getByRole('link')).toHaveAttribute(
      'href',
      member.profileUrl,
    );

    await input.fill(`${member.name} ${member.party}`);
    await expect(rows).toHaveCount(1);

    if (chamber.page === 'state-assembly') {
      await input.fill('alpine');
      await expect(rows).toHaveCount(
        dataset.members.filter((item) => item.counties?.includes('ALPINE'))
          .length,
      );
    }

    await input.fill('no-such-member-xyz');
    await expect(rows).toHaveCount(0);
    await expect(status).toHaveText(`0 of ${dataset.members.length} members`);
    await expect(
      page.getByText('No members match your search.', { exact: true }),
    ).toBeVisible();
    await clear.focus();
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(rows).toHaveCount(dataset.members.length);
    await expect(
      page.getByText('No members match your search.', { exact: true }),
    ).toBeHidden();

    for (const width of [page.viewportSize()!.width, 320]) {
      await page.setViewportSize({ width, height: 850 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const table = (await page.getByRole('table').boundingBox())!;
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(width);
    }
  });
}

test.describe('member lists without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const chamber of chambers) {
    test(`${chamber.page}: every member is in the static page`, async ({
      page,
    }) => {
      const dataset: LegislatorDataset = JSON.parse(
        await readFile(`data/${chamber.file}.json`, 'utf8'),
      );
      const response = await page.goto(`/${chamber.page}.html`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('tbody tr')).toHaveCount(
        dataset.members.length,
      );
      for (const member of dataset.members) {
        await expect(
          page.getByRole('link', { name: member.name, exact: true }),
        ).toHaveAttribute('href', member.profileUrl);
        await expect(
          page.locator(`tr[data-district="${member.district}"] td`).last(),
        ).toHaveText(String(member.nextElectionYear));
      }
      await expect(page.locator('.member-search')).toBeHidden();
      await expect(
        page.getByText(
          new RegExp(`Vacant district: ${dataset.vacancies[0]!.district}`),
        ),
      ).toBeVisible();
    });
  }
});
