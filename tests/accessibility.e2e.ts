import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('home, intake, interview, and decision form meet automated WCAG AA checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  const reports: Record<string, unknown> = {};
  const check = async (name: string) => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    reports[name] = result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) }));
  };
  await check('home');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await check('intake');
  await page.getByLabel('ما الشيء المتقدّم للوظيفة؟').fill('كاميرا');
  await page.getByLabel('متى استخدمته آخر مرة؟').selectOption('I don’t remember');
  await page.getByLabel('ما حالته؟').selectOption('Not sure');
  await page.getByRole('button', { name: 'ابدأ المقابلة' }).click();
  await expect(page.getByRole('heading', { name: 'غرفة المقابلة.' })).toBeVisible();
  await check('interview');
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await check('decision');
  writeFileSync('.test-artifacts/accessibility.json', JSON.stringify(reports, null, 2));
  expect(reports).toEqual({ home: [], intake: [], interview: [], decision: [] });
});
