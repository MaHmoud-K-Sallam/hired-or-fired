import { describe, expect, it } from 'vitest';
import { objectSchema, applicantSchema, decisionSchema, makeApplicant, sampleReply, makeListing, saveDecision, readDesk, decisionLetter, makeInterviewRequest, actionSummary, objectKind, lastUsedOptions, conditionOptions, lastUsedLabels, conditionLabels, STORAGE_KEY } from '../src/lib/model';

const item = { name: 'Waffle maker', lastUsed: 'Over a year ago', condition: 'Needs repair', sentiment: 'A gift from my grandmother' } as const;
const healthy = { ...item, name: 'خلاط نور', condition: 'Like new' as const };

const usageLabels = [
  ['This week', 'هذا الأسبوع'],
  ['This month', 'هذا الشهر'],
  ['A few months ago', 'منذ بضعة أشهر'],
  ['Over a year ago', 'منذ أكثر من عام'],
  ['I don’t remember', 'لا أتذكر'],
] as const;
const stateLabels = [
  ['Like new', 'كالجديد'],
  ['Good, with a little character', 'جيد مع آثار استخدام بسيطة'],
  ['Well-loved but works', 'مستخدم بكثرة لكنه يعمل'],
  ['Needs repair', 'يحتاج إلى إصلاح'],
  ['Not sure', 'لست متأكدًا'],
] as const;

describe('object intake', () => {
  it('rejects blank names and missing facts', () => {
    expect(objectSchema.safeParse({ ...item, name: '   ' }).success).toBe(false);
    expect(objectSchema.safeParse({ name: 'Chair' }).success).toBe(false);
  });
  it('accepts unknown usage without manufacturing a date', () => {
    const facts = objectSchema.parse({ ...item, name: '  Waffle maker  ', lastUsed: 'I don’t remember' });
    expect(facts.name).toBe('Waffle maker');
    expect(facts.lastUsed).toBe('I don’t remember');
    expect(makeApplicant(facts).gap).toBe('لا أتذكر');
  });
  it('retains English enum values while exposing complete Arabic label maps', () => {
    expect(lastUsedOptions).toEqual(usageLabels.map(([value]) => value));
    expect(conditionOptions).toEqual(stateLabels.map(([value]) => value));
    expect(lastUsedLabels).toEqual(Object.fromEntries(usageLabels));
    expect(conditionLabels).toEqual(Object.fromEntries(stateLabels));
    expect(objectSchema.safeParse({ ...item, lastUsed: 'هذا الأسبوع' }).success).toBe(false);
    expect(objectSchema.safeParse({ ...item, condition: 'كالجديد' }).success).toBe(false);
  });
  it.each(usageLabels)('renders the confirmed %s usage without changing its meaning', (lastUsed, label) => {
    const facts = { ...item, lastUsed };
    expect(makeApplicant(facts).gap).toBe(label);
    expect(makeListing(facts)).toContain(`آخر استخدام: ${label}`);
  });
  it.each(stateLabels)('renders the confirmed %s condition without changing its meaning', (condition, label) => {
    const facts = { ...item, condition, sentiment: '' };
    expect(makeApplicant(facts).facts).toEqual([label, 'لم تُذكر أهمية عاطفية']);
    expect(makeListing(facts)).toContain(`الحالة: ${label}`);
  });
});

describe('sample applicant', () => {
  it('preserves condition and sentiment in the Arabic résumé', () => {
    const applicant = makeApplicant(item);
    expect(applicant.facts).toEqual(['يحتاج إلى إصلاح', 'A gift from my grandmother']);
    expect(applicant.title).toMatch(/إفطار/);
    expect(applicant.opening).toContain('Waffle maker');
    expect(applicant.opening).toMatch(/مرحبًا/);
    expect(applicant.skills.every((skill) => /[\u0600-\u06ff]/.test(skill))).toBe(true);
    expect(applicantSchema.safeParse(applicant).success).toBe(true);
  });
  it.each([
    ['خلاط نور', 'blender', /مطبخ/], ['غلاية الشاي', 'blender', /مطبخ/],
    ['محمصة الخبز', 'blender', /إفطار/], ['آلة قهوة', 'blender', /مطبخ/],
    ['صانعة الوافل', 'blender', /إفطار/], ['عصارة', 'blender', /مطبخ/],
    ['نبتة الريحان', 'plant', /نمو/], ['نبات الصبار', 'plant', /نمو/], ['زهرة', 'plant', /نمو/],
    ['حذاء رياضي', 'shoe', /خطوات/], ['أحذية قديمة', 'shoe', /خطوات/], ['جوارب', 'shoe', /خطوات/],
    ['كاميرا ليلى', 'camera', /ذكريات/], ['عدسة تصوير', 'camera', /ذكريات/],
    ['صندوق ليلى', 'box', /إمكانات/],
    ['Blender', 'blender', /مطبخ/], ['Plant', 'plant', /نمو/],
    ['Sneakers', 'shoe', /خطوات/], ['Camera', 'camera', /ذكريات/],
  ])('recognizes %s while preserving the original name', (name, kind, title) => {
    expect(objectKind(name)).toBe(kind);
    const applicant = makeApplicant({ ...item, name });
    expect(applicant.title).toMatch(title);
    expect(applicant.opening).toContain(name);
  });
  it('responds to duplicate ownership without retention pressure in English or Arabic', () => {
    for (const question of ['I already have another waffle maker', 'لدي خلاط آخر', 'عندي خلاط ثانٍ']) {
      const response = sampleReply(item, question, 1);
      expect(response.mood).toBe('nervous');
      expect(response.text).toMatch(/إعادة تنظيم/);
      expect(response.text).toMatch(/منزل آخر/);
      expect(response.text).not.toMatch(/يجب أن تحتفظ|مدين لي/);
    }
  });
  it.each(['لماذا أحتفظ بك؟', 'لِمَاذَا أَحْتَفِظُ بِكَ؟', 'بماذا يمكنك مساعدتي فعلًا؟', 'What can you help me do?'])('offers a concrete role for %s', (question) => {
    const response = sampleReply(healthy, question, 1);
    expect(response.mood).toBe('hopeful');
    expect(response.text).toMatch(/مطبخ/);
    expect(response.text).toMatch(/استخدام/);
    expect(response.text).toMatch(/تخزين/);
  });
  it.each(['فسّر فترة انقطاعك عن العمل.', 'Explain this employment gap', 'متى استخدمتك آخر مرة؟', 'لا أتذكر آخر استخدام'])('acknowledges unknown usage for %s without inventing dates', (question) => {
    const response = sampleReply({ ...item, lastUsed: 'I don’t remember' }, question, 2);
    expect(response.mood).toBe('nervous');
    expect(response.text).toMatch(/مجهولة|غير معروفة/);
    expect(response.text).not.toMatch(/أسبوع|شهر|عام|\d/);
  });
  it('renders known usage in Arabic', () => {
    expect(sampleReply(item, 'فسّر فترة انقطاعك عن العمل.', 1).text).toContain('منذ أكثر من عام');
  });
  it.each(['لماذا أحتفظ بك؟', 'بماذا يمكنك مساعدتي فعلًا؟', 'هل تعمل بأمان؟', 'ما حالتك؟', 'هل يمكن إصلاحك؟', 'What can you help me do?'])('requires a repair assessment rather than a safe-use pitch for %s', (question) => {
    const response = sampleReply(item, question, 2);
    expect(response.mood).toBe('thoughtful');
    expect(response.text).toContain('يحتاج إلى إصلاح');
    expect(response.text).toMatch(/تقييم.*إصلاح/);
    expect(response.text).not.toMatch(/جاهز للاستخدام|آمن للاستخدام|مهمّة في المطبخ/);
  });
  it.each(['كم سعرك؟', 'بكم أبيعك؟', 'ما قيمتك؟', 'What are you worth?'])('does not invent a price for %s', (question) => {
    const response = sampleReply(item, question, 1);
    expect(response.mood).toBe('thoughtful');
    expect(response.text).toMatch(/لا أستطيع تأكيد سعر/);
    expect(response.text).toMatch(/مقارن|مشابهة/);
    expect(response.text).not.toMatch(/[\d٠-٩$€£]/);
  });
  it.each(['أشعر بالذنب لأنك هدية من جدتي', 'لدي ذكريات جميلة معك', 'I feel bad about this gift'])('respects sentiment verbatim without guilt for %s', (question) => {
    const sentiment = 'هدية من جدتي — Summer 2020';
    const response = sampleReply({ ...item, sentiment }, question, 1);
    expect(response.mood).toBe('relieved');
    expect(response.text).toContain(sentiment);
    expect(response.text).toMatch(/الذكرى/);
    expect(response.text).toMatch(/خيارات مقبولة/);
    expect(response.text).not.toMatch(/يجب أن تحتفظ|مدين لي/);
  });
  it('does not invent sentimental history when none was provided', () => {
    const response = sampleReply({ ...item, sentiment: '' }, 'أشعر بالذنب', 1);
    expect(response.text).toMatch(/لا مكان للشعور بالذنب/);
    expect(response.text).not.toMatch(/جدتي|هدية|ذكرياتنا/);
  });
  it.each(['هل أتبرع بك؟', 'حان وقت الوداع', 'أريد لك منزلًا جديدًا', 'Should I donate you?'])('checks donation acceptance for %s', (question) => {
    const response = sampleReply(item, question, 1);
    expect(response.mood).toBe('relieved');
    expect(response.text).toMatch(/تقبل.*حالتي/);
    expect(response.text).toMatch(/وجهة/);
  });
  it.each(['أين أخزنك؟', 'لا توجد مساحة على الرف', 'Where should I store you?'])('recognizes space constraints for %s', (question) => {
    const response = sampleReply(healthy, question, 1);
    expect(response.mood).toBe('thoughtful');
    expect(response.text).toMatch(/مساحتك/);
  });
  it.each([1, 2])('makes the scripted limitation explicit on turn %s in Arabic', (turn) => {
    for (const question of ['Can you quantum teleport?', 'هل تستطيع السفر عبر الزمن؟']) {
      const response = sampleReply(item, question, turn);
      expect(response.text).toMatch(/النموذج التجريبي.*نصوص معدّة مسبقًا/);
      expect(response.text).toMatch(/لا يغطي|لا تغطي/);
      expect(response.mood).toBe('nervous');
    }
  });
});

describe('actionable outcomes', () => {
  it('requires a specific use and location for keep', () => {
    expect(decisionSchema.safeParse({ outcome: 'keep', use: '', location: '' }).success).toBe(false);
    expect(decisionSchema.safeParse({ outcome: 'keep', use: 'Sunday breakfast', location: 'Lower kitchen shelf' }).success).toBe(true);
  });
  it('requires repair and a next step', () => {
    expect(decisionSchema.safeParse({ outcome: 'repair', repair: 'Cable', nextStep: '' }).success).toBe(false);
  });
  it('requires a donation destination and sell draft', () => {
    expect(decisionSchema.safeParse({ outcome: 'donate', destination: '' }).success).toBe(false);
    expect(decisionSchema.safeParse({ outcome: 'sell', title: 'Maker', listing: '', price: '' }).success).toBe(false);
  });
  it('creates an Arabic listing from confirmed facts only', () => {
    const listing = makeListing(item);
    expect(listing).toContain('Waffle maker');
    expect(listing).toContain('يحتاج إلى إصلاح');
    expect(listing).toContain('منذ أكثر من عام');
    expect(listing).toMatch(/تحقق.*الأبعاد.*العلامة التجارية.*القطع/);
    expect(listing).not.toContain('grandmother');
    expect(listing).not.toMatch(/\$|perfect|working|brand new|جاهز للاستخدام|آمن للاستخدام/i);
  });
  it('replaces a previous decision for the same interview', () => {
    const first = { interviewId: 'one', outcome: 'keep' as const, use: 'Breakfast', location: 'Shelf', done: false, updatedAt: '2026-11-19' };
    const second = { interviewId: 'one', outcome: 'donate' as const, destination: 'Community shop', done: false, updatedAt: '2026-11-19' };
    const result = saveDecision([first], second);
    expect(result).toHaveLength(1);
    expect(result[0].outcome).toBe('donate');
  });
  it('writes an Arabic letter for each real outcome without renaming the object', () => {
    for (const outcome of ['keep', 'repair', 'donate', 'sell'] as const) {
      const letter = decisionLetter('Waffle maker — ليلى', outcome);
      expect(letter).toContain('Waffle maker — ليلى');
      expect(letter).toMatch(/[\u0600-\u06ff]/);
      expect(letter).not.toMatch(/Dear|Welcome|Please/);
    }
    expect(decisionLetter(item.name, 'repair')).toMatch(/إصلاح/);
    expect(decisionLetter(item.name, 'sell')).toMatch(/ليست وعدًا بسعر/);
  });
  it('localizes action summary labels but never rewrites user-entered details', () => {
    expect(actionSummary({ outcome: 'keep', use: 'Sunday breakfast', location: 'رف ليلى' })).toBe('Sunday breakfast · مكان التخزين: رف ليلى');
    expect(actionSummary({ outcome: 'repair', repair: 'Cable', nextStep: 'اسأل سامي' })).toBe('Cable · الخطوة التالية: اسأل سامي');
    expect(actionSummary({ outcome: 'donate', destination: 'Community shop' })).toBe('جهّزه وخذه إلى Community shop');
    expect(actionSummary({ outcome: 'sell', title: 'خلاط نور', listing: 'User text', price: '' })).toBe('راجع إعلانك وشاركه: خلاط نور');
  });
});

describe('long conversation requests', () => {
  it('fits the server byte budget without dropping the latest question', () => {
    const messages = Array.from({ length: 30 }, (_, index) => ({ role: index % 2 ? 'user' as const : 'assistant' as const, text: '界'.repeat(990) + index }));
    const request = makeInterviewRequest(item, messages);
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(28 * 1024);
    expect(request.messages.at(-1)?.text).toBe('界'.repeat(990) + '29');
    expect(request.messages.length).toBeGreaterThan(1);
    expect(request.messages.length).toBeLessThan(30);
  });
});

describe('local history boundary', () => {
  it('rejects corrupt or wrong-shaped saved data', () => {
    expect(() => readDesk('broken json')).toThrow();
    expect(() => readDesk('{"version":1,"interviews":[{}],"decisions":[]}')).toThrow();
  });
  it('loads an empty desk and accepts a clean saved desk', () => {
    expect(readDesk(null)).toEqual({ version: 1, interviews: [], decisions: [] });
    expect(readDesk('{"version":1,"interviews":[],"decisions":[]}').interviews).toEqual([]);
  });
  it('keeps the storage key, version, old English generated content and user text unchanged', () => {
    const oldDesk = {
      version: 1,
      interviews: [{
        id: 'old-one', createdAt: '2026-11-19', facts: item, mode: 'live',
        applicant: { title: 'Senior Breakfast Dreamer', opening: 'Hello, I’m your Waffle maker.', skills: ['Open to a new home'], gap: 'Over a year ago', facts: ['Needs repair', item.sentiment] },
        messages: [
          { role: 'user', text: 'Can I keep you? Original كلامي' },
          { role: 'assistant', text: 'Arrange a repair assessment.', mood: 'thoughtful', mode: 'sample' },
        ],
      }],
      decisions: [{ interviewId: 'old-one', outcome: 'sell', title: 'My waffle maker', listing: 'Original listing', price: '25', done: false, updatedAt: '2026-11-19' }],
    };
    expect(STORAGE_KEY).toBe('hired-or-fired.desk.v1');
    const loaded = readDesk(JSON.stringify(oldDesk));
    expect(loaded).toEqual(oldDesk);
    expect(makeInterviewRequest(loaded.interviews[0].facts, loaded.interviews[0].messages)).toEqual({ kind: 'interview', facts: item, messages: oldDesk.interviews[0].messages });
    expect(oldDesk.interviews[0].applicant.gap).toBe('Over a year ago');
  });
});
