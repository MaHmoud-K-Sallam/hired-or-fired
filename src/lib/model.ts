import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const lastUsedOptions = ['This week', 'This month', 'A few months ago', 'Over a year ago', 'I don’t remember'] as const;
export const conditionOptions = ['Like new', 'Good, with a little character', 'Well-loved but works', 'Needs repair', 'Not sure'] as const;
export const lastUsedLabels: Record<(typeof lastUsedOptions)[number], string> = {
  'This week': 'هذا الأسبوع',
  'This month': 'هذا الشهر',
  'A few months ago': 'منذ بضعة أشهر',
  'Over a year ago': 'منذ أكثر من عام',
  'I don’t remember': 'لا أتذكر',
};
export const conditionLabels: Record<(typeof conditionOptions)[number], string> = {
  'Like new': 'كالجديد',
  'Good, with a little character': 'جيد مع آثار استخدام بسيطة',
  'Well-loved but works': 'مستخدم بكثرة لكنه يعمل',
  'Needs repair': 'يحتاج إلى إصلاح',
  'Not sure': 'لست متأكدًا',
};
export const objectSchema = z.object({
  name: text(80),
  lastUsed: z.enum(lastUsedOptions),
  condition: z.enum(conditionOptions),
  sentiment: z.string().trim().max(500),
});
export type ObjectFacts = z.infer<typeof objectSchema>;
export type Outcome = 'keep' | 'repair' | 'donate' | 'sell';
export type Mood = 'hopeful' | 'nervous' | 'thoughtful' | 'relieved';
export const applicantSchema = z.object({
  title: text(100),
  opening: text(500),
  skills: z.array(text(100)).min(1).max(3),
  gap: text(100),
  facts: z.array(z.string().max(500)).max(5),
});
export type Applicant = z.infer<typeof applicantSchema>;
export const messageSchema = z.object({ role: z.enum(['user', 'assistant']), text: text(1000), mood: z.enum(['hopeful', 'nervous', 'thoughtful', 'relieved']).optional(), mode: z.enum(['sample', 'live']).optional() });
export type Message = z.infer<typeof messageSchema>;
export const decisionSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('keep'), use: text(300), location: text(300) }),
  z.object({ outcome: z.literal('repair'), repair: text(300), nextStep: text(300) }),
  z.object({ outcome: z.literal('donate'), destination: text(300) }),
  z.object({ outcome: z.literal('sell'), title: text(120), listing: text(2500), price: z.string().trim().max(50) }),
]);
export type DecisionInput = z.infer<typeof decisionSchema>;
const savedDecisionSchema = z.intersection(decisionSchema, z.object({ interviewId: text(100), done: z.boolean(), updatedAt: text(100) }));
export type Decision = z.infer<typeof savedDecisionSchema>;
export const interviewSchema = z.object({ id: text(100), createdAt: text(100), facts: objectSchema, applicant: applicantSchema, messages: z.array(messageSchema).max(500), mode: z.enum(['sample', 'live']) });
export type Interview = z.infer<typeof interviewSchema>;
const deskSchema = z.object({ version: z.literal(1), interviews: z.array(interviewSchema).max(500), decisions: z.array(savedDecisionSchema).max(500) });
export type Desk = z.infer<typeof deskSchema>;
export const STORAGE_KEY = 'hired-or-fired.desk.v1';
export const emptyDesk = (): Desk => ({ version: 1, interviews: [], decisions: [] });
export function readDesk(raw: string | null): Desk { return raw === null ? emptyDesk() : deskSchema.parse(JSON.parse(raw)); }

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا');
}

export function objectKind(name: string): 'blender' | 'plant' | 'shoe' | 'camera' | 'box' {
  const value = normalizedText(name);
  if (/blender|waffle|toast|mixer|coffee|kettle|kitchen|juic|خلاط|وافل|محمص|قهو[ةه]|غلاي|مطبخ|عصار|عجان/.test(value)) return 'blender';
  if (/plant|cactus|flower|pot|نبت|نبات|صبار|زهر|اصيص/.test(value)) return 'plant';
  if (/shoe|boot|sneaker|trainer|sock|clothes|jacket|حذاء|احذي|جوارب|ملابس|ستر[ةه]/.test(value)) return 'shoe';
  if (/camera|photo|lens|كاميرا|تصوير|عدس[ةه]/.test(value)) return 'camera';
  return 'box';
}

export function makeApplicant(facts: ObjectFacts): Applicant {
  const titles: Record<ReturnType<typeof objectKind>, string> = {
    blender: /waffle|toast|وافل|محمص/.test(normalizedText(facts.name)) ? 'كبير اختصاصيي إفطار العطلات' : 'مدير آفاق المطبخ',
    plant: 'مسؤول النمو الداخلي', shoe: 'خبير الخطوات القادمة', camera: 'مدير صناعة الذكريات', box: 'نائب رئيس الإمكانات غير المستغلّة',
  };
  return {
    title: titles[objectKind(facts.name)], gap: lastUsedLabels[facts.lastUsed],
    facts: [conditionLabels[facts.condition], facts.sentiment || 'لم تُذكر أهمية عاطفية'],
    skills: ['طموح لبدء فصل جديد', 'منفتح على وظيفة محدّدة فعلًا', 'لا يمانع الانتقال إلى بيت جديد'],
    opening: `مرحبًا، أنا ${facts.name}. شكرًا للنظر في طلبي؛ أعددت سيرة ذاتية واثقة جدًا بالنسبة إلى شيء لا يستطيع تشغيل الطابعة. ما الخطوة المناسبة لي برأيك؟`,
  };
}

export function sampleReply(facts: ObjectFacts, question: string, turn: number): { text: string; mood: Mood } {
  const q = normalizedText(question);
  if (/another|duplicate|already have|two of|(?:لدي|عندي|املك).*(?:اخر|ثان|نسخ)|مكرر|نسخة اخرى/.test(q)) return { text: 'فهمت، إذن هذه إعادة تنظيم للموظفين! إذا كانت الوظيفة مشغولة، فانتقالي إلى منزل آخر خطوة مهنية محترمة تمامًا؛ لنبحث عن وجهة مناسبة.', mood: 'nervous' };
  if (/sentiment|gift|memories|grandm|grandp|love|guilt|feel bad|attachment|عاطف|هدي[ةه]|ذكري|ذكرى|(?:جدتي|جدي)(?![ء-ي])|ذنب|تعلق|احبك/.test(q)) return { text: facts.sentiment ? `ذكرتَ «${facts.sentiment}»، وهذا مهم. لا تحتاج الذكرى إلى اجتياز تقييم إنتاجية؛ صورة أو مكان صغير للتذكار أو منزل جديد، كلها خيارات مقبولة.` : 'لا مكان للشعور بالذنب في هذا العقد. يمكنك تقدير ما أمثّله دون منحي إقامة دائمة على الرف؛ صورة تذكارية خيار ممكن إن ناسبك.', mood: 'relieved' };
  if (/money|price|worth|sell|cost|value|سعر|ثمن|قيم[ةت]|ابيع|بيع|بكم|تكلف/.test(q)) return { text: 'ثقتي بنفسي تقول إنني لا أُقدّر بثمن، لكن إعلانك يحتاج إلى حقائق. قارن بأغراض مشابهة في حالتي الفعلية؛ لا أستطيع تأكيد سعر إعادة البيع.', mood: 'thoughtful' };
  if (/gap|last use|how long|remember|انقطاع|متى استخدم|اخر استخدام|اخر مر[ةه]|اتذكر/.test(q)) return { text: facts.lastUsed === 'I don’t remember' ? 'تاريخ آخر استخدام لي غير معروف، لذا تظل فترة الانقطاع مجهولة. كنت سأسميها إجازة تفرّغ، لكن الموارد البشرية طلبت الالتزام بالحقائق؛ لنحدّد خطوة تالية بدل التخمين.' : `السجل يقول «${lastUsedLabels[facts.lastUsed]}». أسميها استراحة استراتيجية، والرف يسميها بطالة؛ هل نحدّد استخدامًا قادمًا فعلًا؟`, mood: 'nervous' };
  const asksForUse = /keep|hire|help|actually|what can|use|job|احتفظ|مساعد|تساعد|يمكنك|استخدم|وظيف|تنفع|تفيد/.test(q);
  if (/repair|broken|condition|fix|اصلاح|اصلح|حال[ةت]|معطل|مكسور|تعمل|امان/.test(q) || (facts.condition === 'Needs repair' && asksForUse)) return { text: `حالتي المسجّلة: «${conditionLabels[facts.condition]}». ${facts.condition === 'Needs repair' ? 'قبل العودة أحتاج إلى تقييم للإصلاح؛ حدّد العطل وخطوة واحدة لفحصه. وإن لم يكن الإصلاح مجديًا، فلا حرج في خيار آخر.' : 'هذا وصف مؤكّد، وليس ضمانًا؛ فحص سريع قبل استخدامي أو نقلي إلى غيرك إدارة حكيمة.'}`, mood: 'thoughtful' };
  if (/donat|goodbye|let.*go|fire|new home|تبرع|وداع|اتخلى|تسريح|منزل.*جديد|بيت.*جديد/.test(q)) return { text: 'انتقال إلى قسم جديد؟ يمكنني التفاهم مع ذلك. تأكّد من أن الجهة المستقبلة تقبل حالتي، ثم حدّد وجهة حقيقية، لا وظيفة دائمة في صندوق الممر.', mood: 'relieved' };
  if (/space|shelf|store|storage|fit|مساح|رف|خزن|تخزين|مكان/.test(q)) return { text: 'أنا مرن بشأن موقع المكتب، لكن إن لم أجد مكانًا يسهل الوصول إليه فقد تكون الوظيفة غير موجودة أصلًا. مساحتك لها الكلمة الأخيرة؛ حدّد مكانًا مناسبًا أو وجهة جديدة.', mood: 'thoughtful' };
  if (asksForUse) {
    const ideas = { blender: 'مهمّة محدّدة في المطبخ تناسب ما تعرفه عنّي', plant: 'مكان يناسب احتياجاتي من الضوء والعناية', shoe: 'جولة أكون فيها مريحًا ومناسبًا لك', camera: 'جولة تصوير تخطّط لها فعلًا', box: 'مهمّة واضحة ترغب فعلًا في إنجازها' };
    return { text: `اقتراحي: ${ideas[objectKind(facts.name)]}. حدّد لي استخدامًا قادمًا ومكان تخزين مناسبًا، لا ترقية غامضة إلى قسم «يومًا ما»؛ وإن لم توجد مهمّة حقيقية فلا أمانع الانتقال.`, mood: 'hopeful' };
  }
  return { text: turn % 2 ? 'هذا السؤال أعلى من درجتي الوظيفية: النموذج التجريبي يعمل وفق نصوص معدّة مسبقًا، ولا يغطي هذا النوع من الأسئلة. جرّب السؤال عن انقطاعي عن العمل أو حالتي أو الخطوة التالية؛ الأسئلة المفتوحة تحتاج إلى الذكاء الاصطناعي المباشر.' : 'سؤال ممتاز، لكن النموذج التجريبي يعتمد على نصوص معدّة مسبقًا لا تغطي هذا السؤال. اسأل عن جدوى الاحتفاظ بي أو عن خطوة عملية تالية؛ القرار لك بلا حرج.', mood: 'nervous' };
}

export function makeInterviewRequest(facts: ObjectFacts, messages: Message[]) {
  const request = { kind: 'interview' as const, facts, messages: messages.slice(-30) };
  const encoder = new TextEncoder();
  while (request.messages.length > 1 && encoder.encode(JSON.stringify(request)).length > 28 * 1024) request.messages.shift();
  return request;
}

export function makeListing(facts: ObjectFacts): string {
  return `${facts.name}\n\nالحالة: ${conditionLabels[facts.condition]}.\nآخر استخدام: ${lastUsedLabels[facts.lastUsed]}.\n\nتحقق من الأبعاد والعلامة التجارية والقطع المرفقة وترتيبات الاستلام قبل مشاركة هذا الإعلان.`;
}
export function saveDecision(decisions: Decision[], decision: Decision): Decision[] { return [decision, ...decisions.filter((entry) => entry.interviewId !== decision.interviewId)]; }
export function decisionLetter(name: string, outcome: Outcome): string {
  const letters = {
    keep: `إلى ${name}،\n\nيسرّنا منحك وظيفة محدّدة في هذا البيت، بمهمّة حقيقية ومكان مخصّص. نذكّرك بأن «لعلّي أحتاجه» ليس قسمًا في الهيكل الإداري.\n\nأهلًا بك في الفريق.`,
    repair: `إلى ${name}،\n\nوافقنا على خطة عودتك، بشرط بعض التطوير المهني؛ والمقصود تحديدًا هو الإصلاح المذكور أدناه. نؤمن بالفرص الثانية، لا بأكوام الإصلاح المؤجّل إلى الأبد.\n\nيرجى الاستعداد للخطوة التالية.`,
    donate: `إلى ${name}،\n\nندعم انتقالك إلى فرصة جديدة. نشكرك على طموحك المهني والتزامك الاستثنائي بشغل مكان على الرف.\n\nنتمنى لك فريقًا جديدًا يناسبك.`,
    sell: `إلى ${name}،\n\nتمت الموافقة على بحثك عن فرصة خارجية. إعلانك مسوّدة وليست وعدًا بسعر أو وظيفة جديدة؛ الخطوة التالية بيد مسؤول التوظيف.\n\nانطلق واترك انطباعًا صادقًا.`,
  };
  return letters[outcome];
}
export function actionSummary(decision: DecisionInput): string {
  switch (decision.outcome) {
    case 'keep': return `${decision.use} · مكان التخزين: ${decision.location}`;
    case 'repair': return `${decision.repair} · الخطوة التالية: ${decision.nextStep}`;
    case 'donate': return `جهّزه وخذه إلى ${decision.destination}`;
    case 'sell': return `راجع إعلانك وشاركه: ${decision.title}`;
  }
}
