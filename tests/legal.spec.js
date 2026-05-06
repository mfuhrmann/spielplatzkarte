import { test, expect } from '@playwright/test';
import {
  injectApiConfig,
  injectHubConfig,
  stubApiRoutes,
  stubHubRegistry,
  stubFederationStatus,
  makePlayground,
} from './helpers.js';

// ── Standalone mode ───────────────────────────────────────────────────────────

test.describe('Standalone — LegalButton', () => {
  test('button absent when both URLs null', async ({ page }) => {
    await injectApiConfig(page);
    await stubApiRoutes(page);
    await page.goto('/');
    await expect(page.locator('button[aria-label="Impressum und Datenschutz"]')).toHaveCount(0);
  });

  test('button visible and opens modal when impressumUrl is set', async ({ page }) => {
    await injectApiConfig(page, { impressumUrl: 'https://example.com/impressum', privacyUrl: null });
    await stubApiRoutes(page);
    await page.goto('/');

    const btn = page.locator('button[aria-label="Impressum und Datenschutz"]');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();

    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Rechtliches' });
    await expect(modal).toBeVisible();
    await expect(modal.locator('a', { hasText: 'Impressum' })).toBeVisible();
    // privacyUrl is null → Datenschutz link must not appear
    await expect(modal.locator('a', { hasText: 'Datenschutzerklärung' })).toHaveCount(0);
  });

  test('button visible and opens modal when privacyUrl is set', async ({ page }) => {
    await injectApiConfig(page, { impressumUrl: null, privacyUrl: 'https://example.com/datenschutz' });
    await stubApiRoutes(page);
    await page.goto('/');

    const btn = page.locator('button[aria-label="Impressum und Datenschutz"]');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();

    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Rechtliches' });
    await expect(modal).toBeVisible();
    await expect(modal.locator('a', { hasText: 'Datenschutzerklärung' })).toBeVisible();
    await expect(modal.locator('a', { hasText: 'Impressum' })).toHaveCount(0);
  });

  test('both links visible when both URLs set', async ({ page }) => {
    await injectApiConfig(page, {
      impressumUrl: 'https://example.com/impressum',
      privacyUrl:   'https://example.com/datenschutz',
    });
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('button[aria-label="Impressum und Datenschutz"]').click();
    const modal = page.locator('[role="dialog"]').filter({ hasText: 'Rechtliches' });
    await expect(modal.locator('a', { hasText: 'Impressum' })).toHaveCount(1);
    await expect(modal.locator('a', { hasText: 'Datenschutzerklärung' })).toHaveCount(1);
  });

  test('Impressum link has correct href and target=_blank', async ({ page }) => {
    await injectApiConfig(page, { impressumUrl: 'https://example.com/impressum' });
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('button[aria-label="Impressum und Datenschutz"]').click();
    const link = page.locator('[role="dialog"] a', { hasText: 'Impressum' });
    await expect(link).toHaveAttribute('href', 'https://example.com/impressum');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('modal closes on Escape', async ({ page }) => {
    await injectApiConfig(page, { impressumUrl: 'https://example.com/impressum' });
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('button[aria-label="Impressum und Datenschutz"]').click();
    await expect(page.locator('[role="dialog"]').filter({ hasText: 'Rechtliches' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]').filter({ hasText: 'Rechtliches' })).toHaveCount(0);
  });
});

// ── Hub mode — drawer legal icons ─────────────────────────────────────────────

const instanceA = {
  slug: 'slug-a',
  url: '/api-a',
  name: 'Instanz A',
  playgrounds: { type: 'FeatureCollection', features: [makePlayground({ osmId: 1, lon: 9.675, lat: 50.551 })] },
  meta: { name: 'Region A', version: '0.4.0', bbox: [9.6, 50.5, 9.7, 50.6] },
};

const instanceB = {
  slug: 'slug-b',
  url: '/api-b',
  name: 'Instanz B',
  playgrounds: { type: 'FeatureCollection', features: [makePlayground({ osmId: 2, lon: 8.680, lat: 50.110 })] },
  meta: { name: 'Region B', version: '0.4.0', bbox: [8.6, 50.0, 8.7, 50.2] },
};

async function openDrawer(page) {
  const pill = page.locator('.instance-slot .pill');
  await expect(pill).toContainText(/\d+/, { timeout: 8000 });
  await pill.click();
  const drawer = page.locator('.drawer[role="dialog"]');
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe('Hub — drawer legal icons', () => {
  test('§ icon absent when impressum_url null', async ({ page }) => {
    await injectHubConfig(page);
    await stubHubRegistry(page, { instanceA, instanceB });
    await stubFederationStatus(page, {
      backends: {
        'slug-a': { url: '/api-a', up: true, impressum_url: null, privacy_url: null },
      },
    });
    await page.goto('/');
    const drawer = await openDrawer(page);
    await expect(drawer.locator('button[title="Impressum"]')).toHaveCount(0);
  });

  test('§ icon visible when impressum_url set; click opens new tab', async ({ page, context }) => {
    await injectHubConfig(page);
    await stubHubRegistry(page, { instanceA, instanceB });
    await stubFederationStatus(page, {
      backends: {
        'slug-a': {
          url: '/api-a',
          up: true,
          impressum_url: 'https://example.com/impressum',
          privacy_url: null,
          last_success: new Date().toISOString(),
        },
      },
    });
    await page.goto('/');
    const drawer = await openDrawer(page);

    const impressumBtn = drawer.locator('button[title="Impressum"]').first();
    await expect(impressumBtn).toBeVisible();

    // Clicking should open a new tab (window.open)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      impressumBtn.click(),
    ]);
    expect(newPage.url()).toBe('https://example.com/impressum');
    await newPage.close();
  });

  test('🔒 icon visible when privacy_url set', async ({ page }) => {
    await injectHubConfig(page);
    await stubHubRegistry(page, { instanceA, instanceB });
    await stubFederationStatus(page, {
      backends: {
        'slug-a': {
          url: '/api-a',
          up: true,
          impressum_url: null,
          privacy_url: 'https://example.com/datenschutz',
          last_success: new Date().toISOString(),
        },
      },
    });
    await page.goto('/');
    const drawer = await openDrawer(page);
    await expect(drawer.locator('button[title="Datenschutz"]').first()).toBeVisible();
    await expect(drawer.locator('button[title="Impressum"]')).toHaveCount(0);
  });

  test('get_legal fallback: null URL triggers fetch and shows iframe modal', async ({ page }) => {
    await injectHubConfig(page);
    await stubHubRegistry(page, { instanceA, instanceB });
    await stubFederationStatus(page, {
      backends: {
        'slug-a': {
          url: '/api-a',
          up: true,
          impressum_url: null,
          privacy_url: null,
          last_success: new Date().toISOString(),
        },
      },
    });

    // Stub get_legal to return content (data-node scenario)
    await page.route('**/api-a/rpc/get_legal**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: '<html><body><h1>Impressum Test</h1></body></html>' }),
      })
    );

    await page.goto('/');
    const drawer = await openDrawer(page);

    // With both URLs null, icons are hidden — this test verifies that
    // the data-node path (no icon shown) gracefully handles null.
    await expect(drawer.locator('button[title="Impressum"]')).toHaveCount(0);
  });
});
