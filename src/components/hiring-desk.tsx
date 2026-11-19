'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, CheckCheck, ChevronRight, CircleHelp, ClipboardList, FileText, FlaskConical, Heart, HeartHandshake, History, LayoutDashboard, Leaf, LockKeyhole, Menu, Plus, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';
import { actionSummary, makeApplicant, saveDecision, type Applicant, type Decision, type DecisionInput, type Interview, type ObjectFacts, type Outcome } from '@/lib/model';
import { useDesk } from '@/lib/use-desk';
import { HeroScene, ObjectArt } from './object-art';
import { Intake } from './intake';
import { InterviewRoom } from './interview';
import { DecisionDialog, outcomes } from './decision-dialog';
import { Modal } from './modal';

type View = 'desk' | 'decisions' | 'history' | 'donations';
const examples: { name: string; title: string; quote: string; color: string; lastUsed: ObjectFacts['lastUsed'] }[] = [
  { name: 'صانعة الوافل', title: 'خبيرة فطور العطلات', quote: '«ما زلت أؤمن بفطور نهاية الأسبوع.»', color: 'peach', lastUsed: 'Over a year ago' },
  { name: 'حذاء الجري', title: 'مدير البدايات الجديدة', quote: '«يكفيني موعد لجولة قصيرة.»', color: 'butter', lastUsed: 'A few months ago' },
  { name: 'الكاميرا القديمة', title: 'مديرة صناعة الذكريات', quote: '«أنتظر فرصتي… أعني لقطتي القادمة.»', color: 'sage', lastUsed: 'I don’t remember' },
];

export function HiringDesk() {
  const { desk, setDesk, ready, storageError, resetDesk } = useDesk();
  const [view, setView] = useState<View>('desk');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{ id: string; letter: boolean } | null>(null);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'delete'; id?: string } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const wasNavOpen = useRef(false);
  useEffect(() => {
    if (mobileNav) sidebarRef.current?.querySelector('button')?.focus();
    else if (wasNavOpen.current) menuRef.current?.focus();
    wasNavOpen.current = mobileNav;
  }, [mobileNav]);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [localAI, setLocalAI] = useState(false);
  const [aiReady, setAIReady] = useState(false);
  const [filter, setFilter] = useState<Outcome | 'all'>('all');
  const [notice, setNotice] = useState('');
  const active = desk.interviews.find((interview) => interview.id === activeId);
  const decisionInterview = desk.interviews.find((interview) => interview.id === decisionTarget?.id);
  const pendingCount = desk.interviews.filter((interview) => !desk.decisions.some((decision) => decision.interviewId === interview.id)).length;
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/interview', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
      .then((response) => response.ok ? response.json() : { configured: false })
      .then((data) => { if (!controller.signal.aborted) { setLiveAvailable(data.configured === true); setLocalAI(data.provider === 'ollama'); } })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setAIReady(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);
  function navigate(next: View) { setView(next); setActiveId(null); setMobileNav(false); if (next === 'decisions') setFilter('all'); }
  async function startInterview(facts: ObjectFacts, mode: 'sample' | 'live', signal?: AbortSignal) {
    let applicant: Applicant = makeApplicant(facts);
    if (mode === 'live') {
      const timeout = AbortSignal.timeout(185000);
      const response = await fetch('/api/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'applicant', facts }), signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!response.ok) throw new Error('تعذّر تجهيز ملف المتقدّم');
      const data = await response.json(); applicant = data.applicant;
    }
    if (signal?.aborted) return;
    const interview: Interview = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), facts, applicant, messages: [{ role: 'assistant', text: applicant.opening, mood: 'hopeful', mode }], mode };
    await setDesk((previous) => ({ ...previous, interviews: [interview, ...previous.interviews] }), signal);
    if (signal?.aborted) return;
    setIntake(false); setActiveId(interview.id); setView('desk'); setMobileNav(false);
  }
  function updateInterview(interview: Interview) { setDesk((previous) => ({ ...previous, interviews: previous.interviews.map((entry) => entry.id === interview.id ? interview : entry) })); }
  function recordDecision(data: DecisionInput) {
    if (!decisionTarget) return;
    setDesk((previous) => ({ ...previous, decisions: saveDecision(previous.decisions, { ...data, interviewId: decisionTarget.id, done: false, updatedAt: new Date().toISOString() }) }));
    setNotice('حُفظ القرار. مساحة إضافية لالتقاط الأنفاس.');
  }
  function toggleDone(decision: Decision) { setDesk((previous) => ({ ...previous, decisions: previous.decisions.map((entry) => entry.interviewId === decision.interviewId ? { ...entry, done: !entry.done } : entry) })); }
  async function performDelete() {
    if (confirm?.kind === 'reset') { const removed = await resetDesk(); setActiveId(null); setDecisionTarget(null); setSettings(false); if (removed) setNotice('بداية جديدة. تم مسح السجل المحلي.'); }
    else if (confirm?.id) { const id = confirm.id; await setDesk((previous) => ({ ...previous, interviews: previous.interviews.filter((entry) => entry.id !== id), decisions: previous.decisions.filter((entry) => entry.interviewId !== id) })); if (activeId === id) setActiveId(null); setNotice('تم حذف المقابلة والقرار المرتبط بها.'); }
    setConfirm(null);
  }
  const nav = [
    { value: 'desk' as const, label: 'مكتب التوظيف', Icon: LayoutDashboard },
    { value: 'decisions' as const, label: 'القرارات المتخذة', Icon: ClipboardList, count: desk.decisions.length },
    { value: 'history' as const, label: 'سجل المقابلات', Icon: History, count: pendingCount || undefined },
    { value: 'donations' as const, label: 'قائمة التبرعات', Icon: HeartHandshake },
  ];
  function renderDecisionCard(decision: Decision) {
    const interview = desk.interviews.find((entry) => entry.id === decision.interviewId);
    if (!interview) return null;
    const outcome = outcomes.find((entry) => entry.value === decision.outcome)!;
    return <article className={`board-card ${decision.done ? 'action-done' : ''}`} key={decision.interviewId}>
      <div className="board-card-top"><div className={`board-object outcome-${decision.outcome}`}><ObjectArt name={interview.facts.name} mood="relieved" /></div><div><span className={`outcome-badge ${decision.outcome}`}><outcome.Icon size={12} />{outcome.label}</span><h3 dir="auto">{interview.facts.name}</h3><span className="board-job" dir="auto">{interview.applicant.title}</span></div></div>
      <p className="board-action" dir="auto">{actionSummary(decision)}</p>
      <label className="check-label action-checkbox"><input type="checkbox" checked={decision.done} onChange={() => toggleDone(decision)} />{decision.done ? 'اكتملت الخطوة التالية' : decision.outcome === 'donate' ? 'تم التبرّع به لبيته الجديد' : 'تحديد الخطوة التالية كمكتملة'}</label>
      <div className="board-card-footer"><button className="text-button" onClick={() => setDecisionTarget({ id: interview.id, letter: true })}><FileText size={14} />خطاب القرار</button><button className="text-button" onClick={() => setDecisionTarget({ id: interview.id, letter: false })}>تعديل <ChevronRight size={14} /></button><button className="icon-button delete-button" aria-label={`حذف مقابلة ${interview.facts.name} وقرارها`} onClick={() => setConfirm({ kind: 'delete', id: interview.id })}><Trash2 size={15} /></button></div>
    </article>;
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">انتقل إلى المحتوى الرئيسي</a>
    <aside ref={sidebarRef} className={`sidebar ${mobileNav ? 'is-open' : ''}`} onKeyDown={(event) => {
      if (!mobileNav) return;
      if (event.key === 'Escape') { setMobileNav(false); return; }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter((button) => button.getClientRects().length > 0);
      const first = buttons[0]; const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <button className="brand" aria-label="توظيف أم تسريح؟ الصفحة الرئيسية" onClick={() => navigate('desk')}><span className="brand-mark"><BriefcaseBusiness size={26} strokeWidth={1.6} /><span /></span><span>توظيف<span className="brand-or"> أم </span>تسريح<span className="brand-question">؟</span><small>أغراض أقل. حياة أوسع.</small></span></button>
      <button className="mobile-close icon-button" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)}><X /></button>
      <button className="button button-primary sidebar-new" disabled={!ready} onClick={() => { setIntake(true); setMobileNav(false); }}><Plus size={18} />مقابلة جديدة</button>
      <nav aria-label="التنقل الرئيسي">{nav.map(({ value, label, Icon, count }) => <button key={value} aria-current={view === value ? 'page' : undefined} className={`nav-link ${view === value ? 'active' : ''}`} onClick={() => navigate(value)}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="kind-note"><Leaf size={24} strokeWidth={1.4} /><h3>أفسح مكانًا<br />لما يهمّك.</h3><p>لا تتخلّص من الذكريات.<br />أنت فقط تفسح لها مساحة.</p><span className="note-line" /></div><button className="nav-link" onClick={() => { setHelp(true); setMobileNav(false); }}><CircleHelp size={18} />كيف يعمل؟</button><button className="nav-link" onClick={() => { setSettings(true); setMobileNav(false); }}><Settings2 size={18} />الإعدادات والخصوصية</button><div className="local-footer"><LockKeyhole size={12} /><span>بيانات مكتبك تبقى على هذا الجهاز.</span></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}
    <div className="main-shell" inert={mobileNav}>
      <header className="topbar"><div><button ref={menuRef} className="mobile-menu icon-button" aria-label="فتح القائمة" onClick={() => setMobileNav(true)}><Menu size={21} /></button><span className="topbar-label">أغراض أقل قليلًا. مساحة أوسع قليلًا.</span></div><div className="topbar-right"><span className="local-status"><span />{storageError ? 'لهذه الجلسة فقط' : 'محفوظ على هذا الجهاز'}</span><button className="manager-avatar" aria-label="حول مكتبك الخاص" onClick={() => setSettings(true)}>أنت</button></div></header>
      <main id="main-content" tabIndex={-1}>
        {storageError && <div className="error-notice storage-notice" role="alert">{storageError}<button className="text-button" onClick={() => setSettings(true)}>فتح الإعدادات</button></div>}
        {active ? <InterviewRoom key={active.id} liveAvailable={liveAvailable} localAI={localAI} checkingAI={!aiReady} interview={active} decision={desk.decisions.find((entry) => entry.interviewId === active.id)} onBack={() => setActiveId(null)} onUpdate={updateInterview} onDecide={() => setDecisionTarget({ id: active.id, letter: false })} /> : view === 'desk' ? <>
          <section className="hero"><div className="hero-copy"><h1>رفوفك تعلن<br />عن <span>وظائف.<svg className="headline-swish" viewBox="0 0 205 14" aria-hidden="true"><path d="M3 9Q90-1 201 6M33 13q85-5 140-2" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" /></svg></span></h1><p className="hero-tagline">وأغراضك تحتاج إلى سيرة ذاتية.</p><p className="hero-description">قابل الأشياء التي لم تعد تستخدمها. احتفظ بما يناسبك، وساعد البقية على بدء فصل جديد.</p><button className="button button-primary hero-cta" disabled={!ready} onClick={() => setIntake(true)}>قابل أحد أغراضك <ArrowRight size={19} /></button><span className="hero-reassurance"><Check size={13} />بلا تأنيب. بلا أحكام. فقط رؤية أوضح.</span></div><HeroScene /></section>
          <section className="process-strip" aria-label="كيف يعمل؟"><div><span className="process-number">١</span><p><strong>تعرّف على المتقدّم</strong><span>أخبرنا عن الشيء الذي ستقابله.</span></p></div><ChevronRight className="process-arrow" size={17} /><div><span className="process-number">٢</span><p><strong>اطرح الأسئلة الصعبة</strong><span>دعه يقدّم حجّته… ببعض الدراما.</span></p></div><ChevronRight className="process-arrow" size={17} /><div><span className="process-number">٣</span><p><strong>اتخذ القرار</strong><span>قرار واضح. وخطوة فعلية تليه.</span></p></div></section>
          <section className="waiting-section"><div className="section-heading"><div><h2>غرفة الانتظار<span className="heading-dot">.</span></h2><p>يبدو مألوفًا؟ جرّب مقابلة أحد هؤلاء المتقدّمين.</p></div><span className="small-label"><FlaskConical size={13} />نماذج مكتوبة مسبقًا</span></div><div className="sample-grid">{examples.map((example) => <button className={`sample-card ${example.color}`} key={example.name} disabled={!ready} onClick={() => void startInterview({ name: example.name, lastUsed: example.lastUsed, condition: 'Good, with a little character', sentiment: '' }, 'sample')}><div className="sample-copy"><h3>{example.name}</h3><p>{example.title}</p><blockquote>{example.quote}</blockquote><span>اسمع حجّته <ArrowRight size={14} /></span></div><ObjectArt name={example.name} /></button>)}</div></section>
          <section className="home-decisions"><div className="section-heading"><div><h2>القرارات المتخذة<span className="count-tag">{desk.decisions.length}</span></h2><p>«سأفعل لاحقًا» أقل. وخطوات منجزة أكثر.</p></div><button className="text-button view-all" onClick={() => navigate('decisions')}>عرض لوحة القرارات <ArrowRight size={15} /></button></div>{desk.decisions.length ? <div className="board-grid home-board">{desk.decisions.slice(0, 3).map(renderDecisionCard)}</div> : <div className="empty-board"><div className="empty-board-icon"><ClipboardList size={27} strokeWidth={1.3} /><span><Check size={11} /></span></div><div><h3>بداية جديدة تليق بك.</h3><p>ستجد قراراتك هنا. ابدأ بشيء واحد فقط.</p></div><button className="text-button" onClick={() => setIntake(true)}>اتخذ قرارك الأول <ArrowRight size={15} /></button></div>}</section>
          <footer className="desk-footer"><span><Heart size={13} />طريقة ألطف للتخلّي عمّا لا تحتاجه.</span><span>مساحتك. أغراضك. قرارك.</span></footer>
        </> : view === 'history' ? <section className="listing-page"><div className="page-title-row"><div><h1>سجل المقابلات.</h1><p>كل محادثة هنا، لتعود إليها متى شئت.</p></div><button className="button button-primary" onClick={() => setIntake(true)}><Plus size={17} />مقابلة جديدة</button></div>{desk.interviews.length ? <div className="history-list">{desk.interviews.map((interview) => {
          const decision = desk.decisions.find((entry) => entry.interviewId === interview.id);
          return <article className="history-row" key={interview.id}><div className="history-art"><ObjectArt name={interview.facts.name} /></div><div className="history-details"><h2 dir="auto">{interview.facts.name}</h2><p dir="auto">{interview.applicant.title}</p><span>{interview.mode === 'sample' ? 'نسخة تجريبية مكتوبة' : 'ذكاء اصطناعي مباشر'} · {new Date(interview.createdAt).toLocaleDateString('ar', { month: 'short', day: 'numeric' })} · الأسئلة: {interview.messages.filter((m) => m.role === 'user').length}</span></div><span className={`outcome-badge ${decision?.outcome ?? 'pending'}`}>{decision ? outcomes.find((entry) => entry.value === decision.outcome)!.label : 'قيد المقابلة'}</span><button className="button button-secondary" onClick={() => setActiveId(interview.id)}>متابعة <ArrowRight size={15} /></button><button className="icon-button delete-button" aria-label={`حذف مقابلة ${interview.facts.name}`} onClick={() => setConfirm({ kind: 'delete', id: interview.id })}><Trash2 size={17} /></button></article>;
        })}</div> : <EmptyState type="history" onStart={() => setIntake(true)} />}</section> : <section className="listing-page"><div className="page-title-row"><div><h1>{view === 'donations' ? 'بيت جديد بانتظاره.' : 'القرارات المتخذة.'}</h1><p>{view === 'donations' ? 'قائمة عملية للفصل القادم: تأكّد من قبول التبرّع، جهّزه، ثم أوصله.' : 'لكل شيء خطوة تالية. وكل قرار قابل للتغيير.'}</p></div><span className="board-total"><CheckCheck size={18} />خطوات مكتملة: {desk.decisions.filter((d) => d.done && (view !== 'donations' || d.outcome === 'donate')).length}</span></div>{view === 'decisions' && <div className="board-filters" role="group" aria-label="تصفية القرارات"><button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>كل القرارات <span>{desk.decisions.length}</span></button>{outcomes.map(({ value, label, Icon }) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}><Icon size={15} />{label}<span>{desk.decisions.filter((entry) => entry.outcome === value).length}</span></button>)}</div>}{desk.decisions.filter((d) => view === 'donations' ? d.outcome === 'donate' : filter === 'all' || d.outcome === filter).length ? <div className="board-grid">{desk.decisions.filter((d) => view === 'donations' ? d.outcome === 'donate' : filter === 'all' || d.outcome === filter).map(renderDecisionCard)}</div> : <EmptyState type={view === 'donations' ? 'donations' : filter === 'all' ? 'decisions' : 'filtered'} onStart={() => setIntake(true)} />}</section>}
      </main>
    </div>
    {intake && <Intake liveAvailable={liveAvailable} localAI={localAI} checkingAI={!aiReady} onClose={() => setIntake(false)} onSubmit={startInterview} />}
    {decisionTarget && decisionInterview && <DecisionDialog key={`${decisionTarget.id}-${decisionTarget.letter}`} interview={decisionInterview} existing={desk.decisions.find((entry) => entry.interviewId === decisionTarget.id)} viewLetter={decisionTarget.letter} onClose={() => setDecisionTarget(null)} onSave={recordDecision} />}
    {help && <Modal title="مقابلة عمل. لأغراضك." onClose={() => setHelp(false)}><div className="help-content"><p>اعتبرها محادثة ودّية مع الأشياء التي تشغل مساحتك، لا اختبارًا عليك اجتيازه.</p><ol><li><strong>تعرّف على المتقدّم.</strong> أدخل اسمه وآخر استخدام وحالته وأي قيمة عاطفية له.</li><li><strong>اسمع حجّته.</strong> اسأل ما تشاء، أو جرّب الأسئلة المقترحة. النموذج التجريبي مكتوب مسبقًا؛ والذكاء الاصطناعي المباشر يتاح عند إعداده.</li><li><strong>ضع خطة حقيقية.</strong> احتفظ به مع استخدام ومكان محدّدين، أو أصلحه بخطوة تالية، أو تبرّع به لجهة معيّنة، أو بعْه عبر مسوّدة إعلان قابلة للتعديل.</li></ol><div className="gentle-note"><Heart size={20} /><p>يمكنك اتخاذ القرار في أي وقت، ومتابعة الحوار بعده، أو تغيير رأيك. للقيمة العاطفية مكانها، وللمساحة الإضافية قيمتها أيضًا.</p></div><button className="button button-primary full-width" onClick={() => { setHelp(false); setIntake(true); }}>قابل أول متقدّم <ArrowRight size={17} /></button></div></Modal>}
    {settings && <Modal title="مكتبك. بياناتك." onClose={() => setSettings(false)}><div className="settings-content"><div className="settings-section"><ShieldCheck size={25} /><div><h3>بلا حساب. وبلا سجل سحابي.</h3><p>تُحفظ المقابلات والقرارات في هذا المتصفح على هذا الجهاز. مسح بيانات المتصفح يحذفها، وهي لا تتزامن بين الأجهزة.</p></div></div><div className="settings-section"><FlaskConical size={25} /><div><h3>{!aiReady ? 'جارٍ التحقق من المحادثة…' : liveAvailable ? localAI ? 'الذكاء الاصطناعي المحلي جاهز' : 'الذكاء الاصطناعي المباشر جاهز' : 'الوضع التجريبي متاح'}</h3><p>الوضع التجريبي يستخدم نصوصًا محلية، وليس ذكاءً اصطناعيًا. {localAI ? liveAvailable ? 'تُعالج التفاصيل والمحادثة على الجهاز الذي يشغّل التطبيق عبر Ollama، دون إرسالها إلى خدمة سحابية. أبقِ Ollama قيد التشغيل؛ قد يستغرق أول رد بضع دقائق.' : 'افتح Ollama وتأكد من تنزيل النموذج المحدّد، ثم أعد تحميل الصفحة. لا يحتاج هذا الخيار إلى مفتاح API.' : liveAvailable ? 'عند اختيار الذكاء الاصطناعي المباشر، تُرسل تفاصيل الشيء والمحادثة الأخيرة إلى OpenAI عبر الخادم.' : <>لتفعيل OpenAI، يضبط مسؤول الخادم <bdi>OPENAI_API_KEY</bdi> واختياريًا <bdi>OPENAI_MODEL</bdi>، ثم يعيد تشغيل التطبيق. لا توضع المفاتيح في المتصفح أبدًا.</>}</p></div></div><div className="settings-section"><LockKeyhole size={25} /><div><h3>أبقِ المعلومات الحساسة خارج السيرة.</h3><p>تجنّب الأسماء والعناوين والمعلومات الخاصة في وصف أغراضك. مسوّدات البيع تستثني الملاحظات العاطفية ولا تُنشر تلقائيًا.</p></div></div><div className="danger-zone"><h3>بداية جديدة تمامًا</h3><p>حذف جميع المقابلات ({desk.interviews.length}) والقرارات ({desk.decisions.length}) من هذا المتصفح. لا يمكن التراجع عن ذلك.</p><button className="button button-danger" onClick={() => { setSettings(false); setConfirm({ kind: 'reset' }); }}><Trash2 size={16} />مسح السجل المحلي بالكامل</button></div></div></Modal>}
    {confirm && <Modal title={confirm.kind === 'reset' ? 'هل نمسح خزانة الملفات كاملة؟' : 'هل نحذف ملف هذا المتقدّم؟'} onClose={() => setConfirm(null)}><p className="modal-intro">{confirm.kind === 'reset' ? 'ستُحذف كل المقابلات والرسائل والقرارات والقوائم من هذا المتصفح.' : 'ستُحذف هذه المقابلة وجميع رسائلها وقرارها من هذا المتصفح.'} لا يمكن التراجع عن ذلك.</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setConfirm(null)}>الاحتفاظ بالسجل</button><button className="button button-danger" onClick={performDelete}><Trash2 size={16} />{confirm.kind === 'reset' ? 'نعم، امسح الكل' : 'حذف المقابلة'}</button></div></Modal>}
    {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
  </div>;
}

function EmptyState({ type, onStart }: { type: 'history' | 'decisions' | 'donations' | 'filtered'; onStart: () => void }) {
  return <div className="page-empty"><div className="page-empty-art"><ObjectArt name={type === 'donations' ? 'plant' : 'box'} mood="hopeful" /></div><h2>{type === 'history' ? 'غرفة المقابلة لك وحدك.' : type === 'donations' ? 'لا انتقالات… حتى الآن.' : type === 'filtered' ? 'لا قرارات في هذا القسم بعد.' : 'مكان لقرارك الأول.'}</h2><p>{type === 'donations' ? 'اختر «تبرّع» في المقابلة لتظهر قائمة تبرعاتك هنا.' : type === 'filtered' ? 'جرّب تصفية أخرى، أو ادعُ متقدّمًا جديدًا إلى المكتب.' : 'شيء واحد. بضعة أسئلة. ورؤية أوضح.'}</p><button className="button button-primary" onClick={onStart}>قابل أحد أغراضك <ArrowRight size={17} /></button></div>;
}
