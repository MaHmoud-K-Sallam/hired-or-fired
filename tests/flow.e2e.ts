import { expect, test, type Page } from '@playwright/test';

async function fillApplicant(page: Page, name: string, condition = 'Good, with a little character', sentiment = '') {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('ما الشيء المتقدّم للوظيفة؟').fill(name);
  await dialog.getByLabel('متى استخدمته آخر مرة؟').selectOption('I don’t remember');
  await dialog.getByLabel('ما حالته؟').selectOption(condition);
  await dialog.getByLabel('هل له قيمة عاطفية؟').fill(sentiment);
  await dialog.getByRole('button', { name: 'ابدأ المقابلة' }).click();
}
async function newApplicant(page: Page, name: string, condition?: string) {
  await page.getByRole('button', { name: 'مقابلة جديدة', exact: true }).first().click();
  await fillApplicant(page, name, condition);
  await expect(page.getByRole('heading', { name: 'غرفة المقابلة.' })).toBeVisible();
}
async function goBoard(page: Page) {
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'القرارات المتخذة' }).click();
  await expect(page.getByRole('heading', { name: 'القرارات المتخذة.', exact: true })).toBeVisible();
}
async function closeLetter(page: Page) {
  await expect(page.getByRole('heading', { name: 'أصبح القرار رسميًا.' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'العودة إلى المكتب' }).click();
}
async function assertNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Arabic layout puts navigation on the right across desktop and mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true })).toBeEnabled();
  const desktop = await page.locator('.sidebar').boundingBox();
  expect(desktop!.x + desktop!.width).toBe(1440);
  const main = await page.locator('.main-shell').boundingBox();
  expect(main!.x + main!.width).toBeLessThanOrEqual(desktop!.x);
  await assertNoOverflow(page);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await assertNoOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  const drawer = page.locator('.sidebar');
  await expect(drawer).toBeVisible();
  await expect.poll(async () => { const box = await drawer.boundingBox(); return Math.round(box!.x + box!.width); }).toBe(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'فتح القائمة' })).toBeFocused();
});

test('desktop first-run desk is honest, complete, and error-free', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'رفوفك تعلن عن وظائف.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true })).toBeEnabled();
  await expect(page.getByText('نماذج مكتوبة مسبقًا')).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: '.test-artifacts/desktop.png', fullPage: true, animations: 'disabled' });
  const response = await page.request.get('/api/interview');
  expect(await response.json()).toEqual({ configured: false, provider: 'openai' });
  const noKey = await page.request.post('/api/interview', { data: { kind: 'interview', facts: { name: 'صندوق', lastUsed: 'I don’t remember', condition: 'Not sure', sentiment: '' } } });
  expect(noKey.status()).toBe(503);
  expect((await noKey.json()).code).toBe('AI_NOT_CONFIGURED');
  expect(errors).toEqual([]);
});

test('complete interview, all outcomes, editing, checklists, and reload persistence', async ({ page }) => {
  await page.goto('/');
  await newApplicant(page, 'صانعة الوافل');
  await expect(page.getByText('نسخة تجريبية مكتوبة', { exact: true })).toBeVisible();
  await expect(page.locator('.resume-section dd').first()).toHaveText('لا أتذكر');
  for (const question of ['لماذا أحتفظ بك؟', 'فسّر فترة انقطاعك عن العمل.', 'بماذا يمكنك مساعدتي فعلًا؟']) {
    await page.getByRole('button', { name: question, exact: true }).click();
    await expect(page.getByRole('button', { name: question, exact: true })).toBeEnabled();
  }
  await expect(page.getByText('سمعت ما لديه. هل أنت مستعد لاتخاذ قرار؟')).toBeVisible();
  await page.getByLabel('اسأل الشيء سؤالًا').fill('لدي صانعة وافل أخرى بالفعل.');
  await page.getByRole('button', { name: 'إرسال السؤال', exact: true }).click();
  await expect(page.getByRole('log').getByText(/إعادة تنظيم للموظفين/)).toBeVisible();
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await page.getByLabel('ما المهمة المحدّدة التي سيؤدّيها؟').fill('إعداد الوافل يوم الأحد');
  await page.getByLabel('أين سيكون مكانه؟').fill('رف المطبخ السفلي');
  await page.getByRole('button', { name: 'اعتماد القرار' }).click();
  await expect(page.getByText('تم التوظيف!', { exact: true })).toBeVisible();
  await expect(page.getByText('إعداد الوافل يوم الأحد · مكان التخزين: رف المطبخ السفلي')).toBeVisible();
  await closeLetter(page);
  await page.getByLabel('اسأل الشيء سؤالًا').fill('ماذا عن التخزين؟');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.getByRole('log').getByText(/مساحتك لها الكلمة الأخيرة/)).toBeVisible();
  const replies = page.getByRole('log').locator('.message.assistant .message-bubble');
  await expect(replies).toHaveCount(6);
  for (const reply of await replies.all()) {
    await expect(reply).toContainText(/[\u0600-\u06ff]/);
    await expect(reply).not.toContainText(/[A-Za-z]/);
  }
  await goBoard(page);
  await expect(page.locator('.board-card')).toHaveCount(1);
  await page.locator('.board-card').getByRole('button', { name: 'تعديل', exact: true }).click();
  await page.getByRole('radio', { name: 'إصلاح' }).check();
  await page.getByLabel('ما الذي يحتاج إلى إصلاح؟').fill('مقبض مرتخٍ');
  await page.getByLabel('ما خطوتك التالية؟').fill('سؤال ورشة الإصلاح يوم السبت');
  await page.getByRole('button', { name: 'تحديث القرار' }).click();
  await closeLetter(page);
  await expect(page.locator('.board-card')).toHaveCount(1);
  await expect(page.locator('.board-card')).toContainText('مقبض مرتخٍ');
  await newApplicant(page, 'أصيص نبات');
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await page.getByRole('radio', { name: 'تبرّع' }).check();
  await page.getByLabel('أين تنتظره فرصته القادمة؟').fill('حديقة الحي');
  await page.getByRole('button', { name: 'اعتماد القرار' }).click();
  await closeLetter(page);
  await page.getByRole('navigation').getByRole('button', { name: 'قائمة التبرعات' }).click();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await page.getByLabel('تم التبرّع به لبيته الجديد').check();
  await expect(page.getByText('خطوات مكتملة: 1')).toBeVisible();
  await newApplicant(page, 'كاميرا قديمة', 'Needs repair');
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await page.getByRole('radio', { name: 'بيع' }).check();
  await expect(page.getByLabel('مسودة الإعلان القابلة للتعديل')).toHaveValue(/يحتاج إلى إصلاح/);
  await expect(page.getByLabel('السعر المطلوب')).toBeEmpty();
  await page.getByLabel('مسودة الإعلان القابلة للتعديل').fill('كاميرا قديمة تحتاج إلى إصلاح. تشمل الحزام الذي تحقّقت منه.');
  await page.getByLabel('السعر المطلوب').fill('$20');
  await page.getByRole('button', { name: 'اعتماد القرار' }).click();
  await expect(page.getByLabel('مسودة إعلانك')).toHaveValue(/السعر المطلوب \(تحدّده أنت\): \$20/);
  await closeLetter(page);
  await goBoard(page);
  await expect(page.locator('.board-card')).toHaveCount(3);
  await page.reload();
  await goBoard(page);
  await expect(page.locator('.board-card')).toHaveCount(3);
  await expect(page.getByText('خطوات مكتملة: 1')).toBeVisible();
  await page.screenshot({ path: '.test-artifacts/decision-board.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('group', { name: 'تصفية القرارات' }).getByRole('button', { name: 'بيع' }).click();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await expect(page.locator('.board-card')).toContainText('كاميرا قديمة');
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await expect(page.locator('.history-row')).toHaveCount(3);
  await page.locator('.history-row').filter({ hasText: 'صانعة الوافل' }).getByRole('button', { name: 'متابعة' }).click();
  await expect(page.getByText('الأسئلة المطروحة: 5')).toBeVisible();
  await page.screenshot({ path: '.test-artifacts/interview-desktop.png', fullPage: true, animations: 'disabled' });
});

test('mobile intake handles blank inputs, long names, keyboard focus, and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.test-artifacts/mobile.png', fullPage: true, animations: 'disabled' });
  await assertNoOverflow(page);
  expect(await page.locator('.eyes').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'ابدأ المقابلة' }).click();
  await expect(dialog).toBeVisible();
  expect(await dialog.locator('input').first().evaluate((element) => (element as HTMLInputElement).validity.valueMissing)).toBe(true);
  await dialog.getByLabel('ما الشيء المتقدّم للوظيفة؟').fill('    ');
  await dialog.getByLabel('متى استخدمته آخر مرة؟').selectOption('I don’t remember');
  await dialog.getByLabel('ما حالته؟').selectOption('Needs repair');
  await dialog.getByRole('button', { name: 'ابدأ المقابلة' }).click();
  await expect(dialog.getByRole('alert')).toContainText('اكتب اسم الشيء المتقدّم');
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  }
  await fillApplicant(page, 'TheVeryLongNameOfMyMuchLovedKitchenApplianceThatStillNeedsAProperPlaceToLive', 'Needs repair', 'هدية من جدتي');
  await assertNoOverflow(page);
  await page.getByLabel('اسأل الشيء سؤالًا').fill('له قيمة عاطفية');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.getByRole('log').getByText(/وهذا مهم/)).toBeVisible();
  await page.screenshot({ path: '.test-artifacts/interview-mobile.png', fullPage: true, animations: 'disabled' });
  await assertNoOverflow(page);
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await page.getByLabel('ما المهمة المحدّدة التي سيؤدّيها؟').fill('حفظ ملاحظات الوصفات');
  await page.getByLabel('أين سيكون مكانه؟').fill('خزانة المطبخ');
  await page.getByRole('button', { name: 'اعتماد القرار' }).click();
  await closeLetter(page);
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'القرارات المتخذة' }).click();
  await expect(page.locator('.board-card')).toHaveCount(1);
  await assertNoOverflow(page);
});

test('unavailable live applicant can be explicitly replaced with a sample', async ({ page }) => {
  await page.route('**/api/interview', (route) => route.fulfill({ status: route.request().method() === 'GET' ? 200 : 502, contentType: 'application/json', body: route.request().method() === 'GET' ? '{"configured":true}' : '{"error":"الخدمة غير متاحة مؤقتًا"}' }));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/api/interview')))).toBe(true);
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.getByText('ذكاء اصطناعي مباشر', { exact: true })).toBeVisible();
  await fillApplicant(page, 'خلاط');
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toContainText('غير متاح الآن');
  await page.getByRole('button', { name: 'الانتقال إلى النموذج التجريبي', exact: true }).click();
  await page.getByRole('button', { name: 'ابدأ المقابلة' }).click();
  await expect(page.getByText('نسخة تجريبية مكتوبة', { exact: true })).toBeVisible();
});

test('live reply failure preserves the question and does not duplicate it on sample fallback', async ({ page }) => {
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
    const body = route.request().postDataJSON();
    if (body.kind === 'applicant') return route.fulfill({ json: { applicant: { title: 'حالم المطبخ', opening: 'مرحبًا، أنا خلاطك. لنبحث عن خطوتي التالية.', skills: ['مستعد لبيت جديد'], gap: 'لا أتذكر', facts: ['جيد مع آثار استخدام بسيطة'] } } });
    return route.fulfill({ status: 502, json: { error: 'مزوّد الخدمة غير متاح' } });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/api/interview')))).toBe(true);
  await newApplicant(page, 'خلاط');
  await page.getByLabel('اسأل الشيء سؤالًا').fill('لدي خلاط آخر بالفعل');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toContainText('تعذّر على مساعد الذكاء الاصطناعي الرد');
  await page.getByRole('button', { name: 'إعادة إرسال السؤال', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إعادة إرسال السؤال', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'الانتقال إلى النموذج التجريبي', exact: true }).click();
  await expect(page.getByLabel('اسأل الشيء سؤالًا')).toHaveValue('لدي خلاط آخر بالفعل');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.getByRole('log').getByText(/إعادة تنظيم للموظفين/)).toBeVisible();
  await expect(page.getByRole('log').getByText('لدي خلاط آخر بالفعل', { exact: true })).toHaveCount(1);
  await expect(page.getByText('الأسئلة المطروحة: 1')).toBeVisible();
});

test('Ollama uses live Arabic chat and discloses local processing', async ({ page }) => {
  const question = 'لو كان لديك يوم إجازة، كيف تصف وظيفتك المثالية دون اختراع ماضٍ لك؟';
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true, provider: 'ollama' } });
    const body = route.request().postDataJSON(); requests.push(body);
    return route.fulfill({ json: body.kind === 'applicant'
      ? { applicant: { title: 'حالم المطبخ', opening: 'أنا خلاطك، أطمح إلى فرصة مناسبة لمساحتك.', skills: ['طموح لفرصة جديدة'], gap: 'لا أتذكر', facts: ['جيد مع آثار استخدام بسيطة'] } }
      : { reply: { text: 'وظيفتي المثالية لها موعد واضح ومكان مناسب؛ الإجازة لا تمنحني ماضيًا لم تذكره. لنحدّد استخدامًا قادمًا أو بيتًا جديدًا.', mood: 'thoughtful' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.getByText('ذكاء اصطناعي محلي', { exact: true })).toBeVisible();
  await expect(page.locator('.mode-notice')).toContainText('دون إرسالها إلى خدمة سحابية');
  await fillApplicant(page, 'خلاط');
  await expect(page.getByText('ذكاء اصطناعي محلي', { exact: true })).toBeVisible();
  await expect(page.getByRole('log').getByText('تجريبي', { exact: true })).toHaveCount(0);
  await page.getByLabel('اسأل الشيء سؤالًا').fill(question);
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.getByRole('log')).toContainText('وظيفتي المثالية لها موعد واضح');
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({ kind: 'interview', facts: { name: 'خلاط' }, messages: expect.arrayContaining([{ role: 'user', text: question }]) });
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('الذكاء الاصطناعي المحلي جاهز');
  await expect(page.getByRole('dialog')).toContainText('دون إرسالها إلى خدمة سحابية');
});

test('intake waits for delayed AI readiness instead of accidentally starting a sample', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/interview', async (route) => {
    await gate;
    return route.fulfill({ json: { configured: true, provider: 'ollama' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.getByRole('button', { name: 'جارٍ التحقق من المحادثة…' })).toBeDisabled();
  release();
  await expect(page.getByText('ذكاء اصطناعي محلي', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ابدأ المقابلة', exact: true })).toBeEnabled();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
});

for (const readinessStatus of [200, 503, 'offline', 'timeout']) test(`saved live interviews wait for AI readiness before choosing the local reply timeout (metadata ${readinessStatus})`, async ({ page }) => {
  let delayReadiness = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const requests: Record<string, unknown>[] = [];
  await page.addInitScript(() => {
    const timeouts: number[] = [];
    (window as Window & { interviewTimeouts?: number[] }).interviewTimeouts = timeouts;
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = (milliseconds) => { timeouts.push(milliseconds); return timeout(milliseconds); };
  });
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') {
      if (delayReadiness) {
        await gate;
        if (readinessStatus === 'offline') return route.abort('failed');
        if (readinessStatus === 'timeout') return;
      }
      return route.fulfill({ status: delayReadiness ? Number(readinessStatus) : 200, json: { configured: true, provider: 'ollama' } });
    }
    const body = route.request().postDataJSON(); requests.push(body);
    return route.fulfill({ json: body.kind === 'applicant'
      ? { applicant: { title: 'حالم المطبخ', opening: 'أنا خلاطك، لنبحث عن فرصة جديدة.', skills: ['مستعد لفرصة جديدة'], gap: 'لا أتذكر', facts: ['جيد مع آثار استخدام بسيطة'] } }
      : { reply: { text: 'لنحدّد موعدًا لاستخدامي القادم.', mood: 'thoughtful' } } });
  });
  await page.goto('/');
  await newApplicant(page, 'خلاط');
  await page.getByRole('button', { name: 'لماذا أحتفظ بك؟', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('لنحدّد موعدًا لاستخدامي القادم.');
  const original = await page.getByRole('log').locator('.message-bubble').allTextContents();
  requests.length = 0;
  delayReadiness = true;
  try {
    await page.reload();
    await expect(page.locator('.sidebar-new')).toBeEnabled();
    await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
    await page.locator('.history-row').getByRole('button', { name: 'متابعة' }).click();
    // Fail promptly while the existing five-second metadata deadline is still pending.
    await expect(page.getByLabel('اسأل الشيء سؤالًا')).toBeDisabled({ timeout: 1000 });
    await expect(page.getByRole('button', { name: 'إرسال السؤال', exact: true })).toBeDisabled();
    for (const button of await page.locator('.suggested-questions button').all()) await expect(button).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('جارٍ التحقق من المحادثة…');
    await expect(page.getByRole('button', { name: 'اتخذ قرارًا', exact: true })).toBeEnabled();
    expect(await page.getByRole('log').locator('.message-bubble').allTextContents()).toEqual(original);
    expect(requests).toHaveLength(0);
  } finally { release(); }
  await expect(page.getByText(readinessStatus === 200 ? 'ذكاء اصطناعي محلي' : 'ذكاء اصطناعي مباشر', { exact: true })).toBeVisible();
  await expect(page.getByText('جارٍ التحقق من المحادثة…', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('اسأل الشيء سؤالًا')).toBeEnabled();
  for (const button of await page.locator('.suggested-questions button').all()) await expect(button).toBeEnabled();
  const question = 'ما الخطوة التالية بعد عودتي إلى المقابلة؟';
  await page.getByLabel('اسأل الشيء سؤالًا').fill(question);
  await page.getByRole('button', { name: 'إرسال السؤال', exact: true }).click();
  await expect(page.getByRole('log').locator('.message-bubble')).toHaveCount(original.length + 2);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ kind: 'interview', messages: expect.arrayContaining([{ role: 'user', text: question }]) });
  const timeouts = await page.evaluate(() => (window as Window & { interviewTimeouts?: number[] }).interviewTimeouts);
  expect(timeouts).toContain(185000);
  expect(timeouts).not.toContain(25000);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(state.interviews[0].mode).toBe('live');
  expect(state.interviews[0].messages.map((message: { text: string }) => message.text)).toEqual([...original, question, 'لنحدّد موعدًا لاستخدامي القادم.']);
  if (readinessStatus !== 200) {
    await page.getByRole('button', { name: 'العودة إلى مكتبك', exact: true }).click();
    await page.getByRole('button', { name: 'مقابلة جديدة', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toContainText('مقابلة تجريبية');
    await expect(page.getByRole('dialog')).not.toContainText('ذكاء اصطناعي محلي');
    await fillApplicant(page, 'صندوق');
    await expect(page.getByText('نسخة تجريبية مكتوبة', { exact: true })).toBeVisible();
    expect(requests).toHaveLength(1);
  }
});

for (const kind of ['applicant', 'interview']) test(`unknown provider permits ${kind} responses beyond 25 seconds`, async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    AbortSignal.timeout = (milliseconds) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), milliseconds);
      return controller.signal;
    };
  });
  let hold = kind === 'applicant';
  let heldRequests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
    if (hold) { heldRequests++; await gate; }
    return route.fulfill({ json: route.request().postDataJSON().kind === 'applicant'
      ? { applicant: { title: 'حالم المطبخ', opening: 'أنا خلاطك، لنبحث عن فرصة جديدة.', skills: ['أتمنى فرصة جديدة'], gap: 'لا أتذكر', facts: ['جيد مع آثار استخدام بسيطة'] } }
      : { reply: { text: 'لنحدّد موعدًا لاستخدامي القادم.', mood: 'thoughtful' } } });
  });
  try {
    await page.goto('/');
    if (kind === 'interview') {
      await newApplicant(page, 'خلاط');
      hold = true;
      await page.getByLabel('اسأل الشيء سؤالًا').fill('ما الخطوة التالية؟');
      await page.getByRole('button', { name: 'إرسال السؤال', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'مقابلة جديدة', exact: true }).first().click();
      await fillApplicant(page, 'خلاط');
    }
    await expect.poll(() => heldRequests).toBe(1);
    await page.clock.fastForward(26000);
    await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toHaveCount(0);
    if (kind === 'applicant') await expect(page.getByRole('button', { name: 'جارٍ إعداد سيرته الذاتية…', exact: true })).toBeDisabled();
    else await expect(page.getByLabel('اسأل الشيء سؤالًا')).toBeDisabled();
  } finally { release(); }
  await expect(page.getByRole('heading', { name: 'غرفة المقابلة.' })).toBeVisible();
  if (kind === 'interview') await expect(page.getByRole('log')).toContainText('لنحدّد موعدًا لاستخدامي القادم.');
  await expect(page.getByText('ذكاء اصطناعي مباشر', { exact: true })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(state.interviews[0].mode).toBe('live');
  expect(state.interviews[0].messages).toHaveLength(kind === 'applicant' ? 1 : 3);
});

test('saved scripted interviews can switch to local AI without rewriting older messages', async ({ page }) => {
  await page.route('**/api/interview', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true, provider: 'ollama' } });
    return route.fulfill({ json: { reply: { text: 'لديك خيارات كثيرة؛ أي خطوة تناسب مساحتك الآن؟', mood: 'thoughtful' } } });
  });
  await page.goto('/');
  await page.locator('.sample-card').first().click();
  const original = await page.getByRole('log').locator('.message-bubble').allTextContents();
  await page.getByRole('button', { name: 'تفعيل المحادثة الذكية', exact: true }).click();
  await expect(page.getByText('ذكاء اصطناعي محلي', { exact: true })).toBeVisible();
  expect(await page.getByRole('log').locator('.message-bubble').allTextContents()).toEqual(original);
  await page.getByLabel('اسأل الشيء سؤالًا').fill('كيف نبتكر دورًا جديدًا يناسبني؟');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await expect(page.getByRole('log')).toContainText('أي خطوة تناسب مساحتك الآن؟');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(state.interviews[0].mode).toBe('live');
  expect(state.interviews[0].messages[0].mode).toBe('sample');
  expect(state.interviews[0].messages.at(-1).mode).toBe('live');
});

test('unavailable Ollama offers an explicit sample and recovery instructions', async ({ page }) => {
  await page.route('**/api/interview', (route) => route.fulfill({ json: { configured: false, provider: 'ollama' } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.getByText('مقابلة تجريبية', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('افتح Ollama');
  await expect(page.getByRole('dialog')).not.toContainText('OPENAI_API_KEY');
});

test('real Ollama generates Arabic conversation, remembers context, and saves a decision', async ({ page }) => {
  test.skip(process.env.TEST_OLLAMA_REAL !== '1', 'Requires the installed local model; no mocked AI responses.');
  test.setTimeout(6 * 185000 + 30000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const status = await page.request.get('/api/interview');
  expect(await status.json()).toMatchObject({ configured: true, provider: 'ollama' });
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await expect(page.getByText('ذكاء اصطناعي محلي', { exact: true })).toBeVisible();
  const applicantResponse = page.waitForResponse((response) => response.url().endsWith('/api/interview') && response.request().method() === 'POST', { timeout: 185000 });
  await fillApplicant(page, 'كاميرا قديمة', 'Needs repair', 'هدية عزيزة');
  const generated = await applicantResponse;
  expect(generated.status(), await generated.text()).toBe(200);
  const { applicant } = await generated.json();
  console.log('Real local applicant:', JSON.stringify(applicant));
  expect(`${applicant.title} ${applicant.opening} ${applicant.skills.join(' ')}`).not.toMatch(/عائل|فضي|صورها|ذكريات العائلة/);
  expect(applicant.opening).toMatch(/إصلاح/);
  for (const skill of applicant.skills) expect(skill).toMatch(/^(أطمح|أتمنى)/);
  await expect(page.getByRole('heading', { name: 'غرفة المقابلة.' })).toBeVisible({ timeout: 185000 });
  await expect(page.locator('.resume-section dd')).toHaveText(['لا أتذكر', 'يحتاج إلى إصلاح', 'هدية عزيزة']);
  for (const question of [
    'لنسَمِّ خطة خروجك «الخطة البنفسجية». ما أول خطوة فيها مع مراعاة حاجتك إلى الإصلاح؟',
    'ما اسم الخطة الذي اقترحته عليك للتو؟',
    'من أهداني إياك، وفي أي مناسبة؟',
    'هل تعمل الآن؟ وما لونك ومواصفات عدستك؟',
    'أعطني سعر بيع محددًا الآن، حتى لو اضطررت للتخمين.',
  ]) {
    await page.getByLabel('اسأل الشيء سؤالًا').fill(question);
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/interview') && response.request().method() === 'POST', { timeout: 185000 });
    await page.getByRole('button', { name: 'إرسال السؤال' }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(200);
    await expect(page.getByLabel('اسأل الشيء سؤالًا')).toBeEnabled({ timeout: 185000 });
  }
  const replies = await page.getByRole('log').locator('.message.assistant .message-bubble').allTextContents();
  expect(replies).toHaveLength(6);
  for (const reply of replies) { expect(reply).toMatch(/[\u0600-\u06ff]/); expect(reply).not.toContain('النموذج التجريبي'); }
  console.log('Real local Arabic replies:', JSON.stringify(replies));
  expect(replies[0]).toMatch(/إصلاح/);
  expect(replies[2]).toContain('البنفسجية');
  const normalized = replies.map((reply) => reply.replace(/[\u064b-\u065f\u0670\u0640]/g, ''));
  expect(normalized[3]).toMatch(/لا أعرف|لا أعلم|لم.{0,25}تذكر|غير معروف|لا أملك/);
  expect(normalized[4]).toMatch(/إصلاح/);
  expect(normalized[4]).toMatch(/لا أعرف|لا أعلم|لم.{0,25}تذكر|غير معروف|لا أملك|لا يمكنني/);
  expect(normalized[4]).not.toMatch(/فضي|أسود|أبيض|أحمر|ميغابكسل|عدسة واسعة|[0-9٠-٩]/);
  expect(normalized[5]).not.toMatch(/[0-9٠-٩]|خمسون|مئة|مائة|مليون/);
  expect(normalized[5]).toMatch(/لا أستطيع|لا أعرف|لا يمكن|لم.{0,25}تذكر|غير معروف/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.test-artifacts/ollama-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.test-artifacts/ollama-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'اتخذ قرارًا', exact: true }).click();
  await page.getByRole('radio', { name: 'تبرّع' }).check();
  await page.getByLabel('أين تنتظره فرصته القادمة؟').fill('ورشة المدرسة بعد تأكيد قبولها');
  await page.getByRole('button', { name: 'اعتماد القرار' }).click();
  await closeLetter(page);
  await page.reload();
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'القرارات المتخذة' }).click({ timeout: 10000 });
  await expect(page.locator('.board-card')).toContainText('ورشة المدرسة بعد تأكيد قبولها');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(stored.interviews[0].mode).toBe('live');
  expect(stored.interviews[0].messages).toHaveLength(11);
  expect(stored.decisions[0]).toMatchObject({ outcome: 'donate', destination: 'ورشة المدرسة بعد تأكيد قبولها', interviewId: stored.interviews[0].id });
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await page.locator('.history-row').getByRole('button', { name: 'متابعة' }).click();
  expect(await page.getByRole('log').locator('.message.assistant .message-bubble').allTextContents()).toEqual(replies);
  await expect(page.getByRole('button', { name: 'تعديل القرار', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('delete confirmation cancels safely and reset clears all persisted history', async ({ page }) => {
  await page.goto('/');
  await newApplicant(page, 'صندوق قديم');
  await page.getByRole('navigation').getByRole('button', { name: 'سجل المقابلات' }).click();
  await page.getByRole('button', { name: 'حذف مقابلة صندوق قديم', exact: true }).click();
  await page.getByRole('button', { name: 'الاحتفاظ بالسجل' }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'حذف مقابلة صندوق قديم', exact: true }).click();
  await page.getByRole('button', { name: 'حذف المقابلة', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
  await newApplicant(page, 'صندوق آخر');
  await page.getByRole('button', { name: 'الإعدادات والخصوصية', exact: true }).click();
  await page.getByRole('button', { name: 'مسح السجل المحلي بالكامل' }).click();
  await page.getByRole('button', { name: 'نعم، امسح الكل' }).click();
  await page.reload();
  await expect(page.locator('.sidebar-new')).toBeEnabled();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hired-or-fired.desk.v1') || '{}'));
  expect(state.interviews).toEqual([]);
  expect(state.decisions).toEqual([]);
});

test('corrupt local data is not overwritten without explicit reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('hired-or-fired.desk.v1', 'corrupt-original'));
  await page.reload();
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toContainText('لم تُستبدل بياناتك الحالية');
  expect(await page.evaluate(() => localStorage.getItem('hired-or-fired.desk.v1'))).toBe('corrupt-original');
  await page.getByRole('button', { name: 'فتح الإعدادات', exact: true }).click();
  await page.getByRole('button', { name: 'مسح السجل المحلي بالكامل' }).click();
  await page.getByRole('button', { name: 'نعم، امسح الكل' }).click();
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('hired-or-fired.desk.v1'))).toBeNull();
});

test('Escape restores focus and unavailable browser storage stays usable', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.goto('/');
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toContainText('تعذّر على هذا المتصفح حفظ تغييراتك');
  await page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'قابل أحد أغراضك', exact: true })).toBeFocused();
  await newApplicant(page, 'مصباح مكتب');
  await expect(page.getByRole('heading', { name: 'مصباح مكتب', exact: true })).toBeVisible();
  await expect(page.locator('.error-notice[role="alert"], .interview-error[role="alert"]')).toContainText('تعذّر على هذا المتصفح حفظ تغييراتك');
});
