import { expect, test } from '@playwright/test';
import type { Desk } from '../src/lib/model';

async function fill(page: import('@playwright/test').Page, name: string) {
  await page.getByLabel('ما الشيء المتقدّم للوظيفة؟').fill(name);
  await page.getByLabel('متى استخدمته آخر مرة؟').selectOption('I don’t remember');
  await page.getByLabel('ما حالته؟').selectOption('Not sure');
  await page.getByRole('button', { name: 'ابدأ المقابلة' }).click();
}

test('old English desk v1 resumes with Arabic facts and new replies without rewriting saved history', async ({ page }) => {
  const oldDesk: Desk = {
    version: 1,
    interviews: [{
      id: 'd83a9034-09da-4d90-a46e-58c92a642263',
      createdAt: '2026-10-15T09:00:00.000Z',
      facts: { name: 'Old camera', lastUsed: 'I don’t remember', condition: 'Needs repair', sentiment: 'A gift from my grandmother' },
      applicant: {
        title: 'Director of Making Memories',
        opening: 'Hello, I’m your Old camera. Thank you for considering my application. I’ve prepared a very confident résumé for someone who cannot operate a printer.',
        skills: ['Ambitious about a second act', 'Open to a very specific job', 'Comfortable with a new home'],
        gap: 'I don’t remember',
        facts: ['Needs repair', 'A gift from my grandmother'],
      },
      messages: [
        { role: 'assistant', text: 'Hello, I’m your Old camera. Thank you for considering my application. I’ve prepared a very confident résumé for someone who cannot operate a printer.', mood: 'hopeful', mode: 'sample' },
        { role: 'user', text: 'What needs repairing?' },
        { role: 'assistant', text: 'My condition is “Needs repair”. Before a comeback, I need a repair assessment. Name the fix and one next step. If it isn’t worthwhile, I understand.', mood: 'thoughtful', mode: 'sample' },
      ],
      mode: 'sample',
    }],
    decisions: [{ interviewId: 'd83a9034-09da-4d90-a46e-58c92a642263', outcome: 'repair', repair: 'Loose shutter button', nextStep: 'Ask the repair café on Saturday', done: false, updatedAt: '2026-10-15T09:05:00.000Z' }],
  };
  const original = JSON.stringify(oldDesk);
  const oldInterview = oldDesk.interviews[0];
  await page.goto('/');
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  await page.evaluate((raw) => localStorage.setItem('hired-or-fired.desk.v1', raw), original);
  await page.reload();
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  await expect(page.locator('.storage-notice')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('hired-or-fired.desk.v1'))).toBe(original);
  await page.getByRole('navigation').getByRole('button', { name: 'القرارات المتخذة' }).click();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await expect(page.locator('.board-card .outcome-badge')).toHaveText('إصلاح');
  await expect(page.locator('.board-card')).toContainText('Loose shutter button');
  await expect(page.locator('.board-card')).toContainText('Ask the repair café on Saturday');
  await page.locator('.board-card').getByRole('button', { name: 'تعديل', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'إصلاح' })).toBeChecked();
  await expect(page.getByLabel('ما الذي يحتاج إلى إصلاح؟')).toHaveValue('Loose shutter button');
  await expect(page.getByLabel('ما خطوتك التالية؟')).toHaveValue('Ask the repair café on Saturday');
  await page.getByRole('dialog').getByRole('button', { name: 'إغلاق', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.locator('.history-row').getByRole('button', { name: 'متابعة' }).click();
  await expect(page.getByRole('heading', { name: 'غرفة المقابلة.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Old camera', exact: true })).toBeVisible();
  await expect(page.locator('.applicant-title')).toHaveText(oldInterview.applicant.title);
  await expect(page.locator('.resume-section dd')).toHaveText(['لا أتذكر', 'يحتاج إلى إصلاح', 'A gift from my grandmother']);
  for (const message of oldInterview.messages) {
    await expect(page.getByRole('log').getByText(message.text, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'تعديل القرار', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hired-or-fired.desk.v1'))).toBe(original);
  const question = 'فسّر فترة انقطاعك عن العمل.';
  await page.getByRole('button', { name: question, exact: true }).click();
  await expect(page.getByRole('button', { name: question, exact: true })).toBeEnabled();
  await expect(page.getByRole('log').locator('.message-bubble')).toHaveCount(oldInterview.messages.length + 2);
  const reply = page.getByRole('log').locator('.message.assistant .message-bubble').last();
  await expect(reply).toContainText(/[\u0600-\u06ff]/);
  await expect(reply).not.toContainText(/[A-Za-z]/);
  await expect(page.getByText('الأسئلة المطروحة: 2')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}').interviews[0].messages.length)).toBe(oldInterview.messages.length + 2);
  const saved: Desk = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect({ ...saved, interviews: saved.interviews.map((interview) => ({ ...interview, messages: interview.messages.slice(0, oldInterview.messages.length) })) }).toEqual(oldDesk);
  expect(saved.interviews[0].messages.slice(oldInterview.messages.length)).toEqual([
    { role: 'user', text: question },
    expect.objectContaining({ role: 'assistant', text: await reply.innerText(), mode: 'sample' }),
  ]);
  await page.reload();
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'))).toEqual(saved);
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await page.locator('.history-row').getByRole('button', { name: 'متابعة' }).click();
  await expect(page.getByRole('log').getByText(oldInterview.applicant.opening, { exact: true })).toBeVisible();
  await expect(page.getByRole('log').getByText(saved.interviews[0].messages.at(-1)!.text, { exact: true })).toBeVisible();
});

test('reset propagates to another tab and later edits do not resurrect deleted interviews', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('.sidebar-new').click();
  await fill(page, 'صندوق التبويب القديم');
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('.sidebar-new')).toBeEnabled();
  await other.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(other.locator('.history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click();
  await page.getByRole('button', { name: 'مسح السجل المحلي بالكامل' }).click();
  await page.getByRole('button', { name: 'نعم، امسح الكل' }).click();
  await expect(other.locator('.history-row')).toHaveCount(0);
  await other.locator('.sidebar-new').click();
  await fill(other, 'صندوق التبويب الجديد');
  await other.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(other.locator('.history-row')).toHaveCount(1);
  await expect(other.locator('.history-row')).toContainText('صندوق التبويب الجديد');
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).not.toContainText('صندوق التبويب القديم');
});

test('history mutations wait for the same cross-tab transaction lock', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('.sidebar-new').click();
  await fill(page, 'الصندوق الأصلي');
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('.sidebar-new')).toBeEnabled();
  await page.evaluate(() => new Promise<void>((granted) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    (window as unknown as { releaseDeskLock: () => void }).releaseDeskLock = release;
    void navigator.locks.request('hired-or-fired.desk.v1', async () => { granted(); await hold; });
  }));
  await other.locator('.sidebar-new').click();
  await fill(other, 'الصندوق المتزامن');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(stored.interviews.map((entry: { facts: { name: string } }) => entry.facts.name)).toEqual(['الصندوق الأصلي']);
  await page.evaluate(() => (window as unknown as { releaseDeskLock: () => void }).releaseDeskLock());
  await expect(other.getByRole('heading', { name: 'الصندوق المتزامن', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}').interviews.length)).toBe(2);
});

test('cancelled live intake cannot add a late applicant after a history reset', async ({ page }) => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let received: (() => void) | undefined;
  const requestReceived = new Promise<void>((resolve) => { received = resolve; });
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
    received?.();
    await gate;
    await route.fulfill({ json: { applicant: { title: 'متقدّم متأخّر', opening: 'من فضلك لا تضفني بعد إلغاء المقابلة.', skills: ['الانتظار'], gap: 'لا أتذكر', facts: ['لست متأكدًا'] } } }).catch(() => {});
  });
  await page.goto('/');
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/api/interview')))).toBe(true);
  await page.locator('.sidebar-new').click();
  await fill(page, 'صندوق المقابلة الملغاة');
  await requestReceived;
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click();
  await page.getByRole('button', { name: 'مسح السجل المحلي بالكامل' }).click();
  await page.getByRole('button', { name: 'نعم، امسح الكل' }).click();
  release?.();
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(page.getByRole('heading', { name: 'سجل المقابلات.' })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
});

test('closed mobile drawer has no invisible focus stops and Escape restores menu focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'فتح القائمة' }).focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('.sidebar')?.contains(document.activeElement))).toBe(false);
  }
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'فتح القائمة' })).toBeFocused();
  await expect(page.getByRole('navigation')).not.toBeVisible();
});
