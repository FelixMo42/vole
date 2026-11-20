import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { load } from 'cheerio';

test('the static build loads without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main')).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('static Markdown', () => {
  test.use({ javaScriptEnabled: false });

  test('content is readable without JavaScript', async ({ page }) => {
    const builtPage = await readFile('dist/index.html', 'utf8');
    const heading = load(builtPage)('main h1').first().text();
    expect(heading, 'The homepage should have a Markdown heading').toBeTruthy();
    await page.goto('/');
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 }),
    ).toHaveText(heading!);
  });

  test('every map item links to a titled page and back', async ({ page }) => {
    await page.goto('/');
    const homeTitle = await page.title();
    const map = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Legislative', exact: true }),
    });
    const cells = map.locator('tbody td').filter({ hasText: /\S/ });
    await expect(cells).toHaveCount(6);
    const destinations = await cells.evaluateAll((items) =>
      items.map((cell) => ({
        title: cell.textContent?.trim() ?? '',
        href: cell.querySelector('a')?.getAttribute('href'),
      })),
    );
    expect(new Set(destinations.map((item) => item.href)).size).toBe(6);

    for (const destination of destinations) {
      expect(destination.href).toMatch(/^\.\/[a-z-]+\.html$/);
      await page
        .getByRole('link', { name: destination.title, exact: true })
        .click();
      await expect(page).toHaveTitle(destination.title);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        destination.title,
      );
      await expect(
        page.getByRole('navigation', { name: 'Table of contents' }),
      ).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        destination.title,
      );
      const styledWidth = await page
        .locator('main')
        .evaluate((main) => getComputedStyle(main).maxWidth);
      expect(styledWidth).toBe('800px');
      await page
        .getByRole('link', { name: 'Back to map', exact: true })
        .click();
      await expect(page).toHaveTitle(homeTitle);
      await expect(map).toBeVisible();
    }
  });

  test('contents link to sections and fit beside or above the content', async ({
    page,
  }) => {
    await page.goto('/');
    const toc = page.getByRole('navigation', { name: 'Table of contents' });
    await expect(toc).toBeVisible();
    const headings = await page
      .locator('main :is(h2, h3, h4, h5, h6)')
      .evaluateAll((items) =>
        items.map((item) => ({ id: item.id, title: item.textContent ?? '' })),
      );
    expect(headings.length).toBeGreaterThan(0);
    expect(new Set(headings.map(({ id }) => id)).size).toBe(headings.length);
    await expect(toc.getByRole('link')).toHaveCount(headings.length);

    const widths = [page.viewportSize()!.width, 320];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 850 });
      const navigation = (await toc.boundingBox())!;
      const main = (await page.getByRole('main').boundingBox())!;
      if (width >= 1200) {
        expect(navigation.x + navigation.width).toBeLessThanOrEqual(main.x);
        const content = (await page.locator('main > h1').boundingBox())!;
        expect(content.x - (navigation.x + navigation.width)).toBe(20);
        expect(Math.abs(main.x + main.width / 2 - width / 2)).toBeLessThan(1);
      } else {
        expect(navigation.y + navigation.height).toBeLessThanOrEqual(main.y);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }

    for (const { id, title } of headings) {
      const link = toc.getByRole('link', { name: title, exact: true });
      await expect(link).toHaveAttribute('href', `#${id}`);
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
    }
  });
});
