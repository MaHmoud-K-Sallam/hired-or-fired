'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUp, BriefcaseBusiness, Check, ChevronRight, ClipboardList, FlaskConical, LoaderCircle, MessageCircle, Sparkles } from 'lucide-react';
import { conditionLabels, lastUsedLabels, makeInterviewRequest, sampleReply, type Decision, type Interview, type Mood } from '@/lib/model';
import { ObjectArt } from './object-art';

const questions = ['لماذا أحتفظ بك؟', 'فسّر فترة انقطاعك عن العمل.', 'بماذا يمكنك مساعدتي فعلًا؟'];
const moodLabels: Record<Mood, string> = { hopeful: 'متفائل بحذر', nervous: 'يعدّل ربطة عنقه الخيالية', thoughtful: 'يفكّر في خياراته', relieved: 'مستعد للفصل القادم' };

export function InterviewRoom({ interview, decision, onBack, onUpdate, onDecide, liveAvailable, localAI, checkingAI }: { interview: Interview; decision?: Decision; onBack: () => void; onUpdate: (interview: Interview) => void; onDecide: () => void; liveAvailable: boolean; localAI: boolean; checkingAI: boolean }) {
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkingLive = interview.mode === 'live' && checkingAI;
  const turns = interview.messages.filter((m) => m.role === 'user').length;
  const mood = [...interview.messages].reverse().find((m) => m.mood)?.mood ?? 'hopeful';
  useEffect(() => { if (turns || pending) endRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }); }, [interview.messages.length, pending, turns]);
  useEffect(() => () => { controllerRef.current?.abort(); }, []);
  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || busy || checkingLive) return;
    if (interview.messages.length >= 498) { setError('بلغت هذه المقابلة الحد الأقصى للسجل المحلي. يمكنك اتخاذ قرار أو تعديله، أو بدء مقابلة جديدة.'); return; }
    setPending(text); setQuestion(''); setBusy(true); setError('');
    const controller = new AbortController(); controllerRef.current = controller;
    const messages = [...interview.messages, { role: 'user' as const, text }];
    try {
      let reply: { text: string; mood: Mood };
      if (interview.mode === 'sample') {
        await new Promise((resolve) => setTimeout(resolve, 450));
        reply = sampleReply(interview.facts, text, turns + 1);
      } else {
        const response = await fetch('/api/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeInterviewRequest(interview.facts, messages)), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(185000)]) });
        if (!response.ok) throw new Error('الذكاء الاصطناعي غير متاح');
        const data = await response.json(); reply = data.reply;
      }
      if (controller.signal.aborted) return;
      onUpdate({ ...interview, messages: [...messages, { role: 'assistant', text: reply.text, mood: reply.mood, mode: interview.mode }] });
      setPending(''); inputRef.current?.focus();
    } catch { if (!controller.signal.aborted) { setError('تعذّر على مساعد الذكاء الاصطناعي الرد. مقابلتك محفوظة. أعد المحاولة، أو انتقل إلى النسخة التجريبية المكتوبة.'); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function submit(e: FormEvent) { e.preventDefault(); void ask(question); }
  return <div className="interview-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16} />العودة إلى مكتبك</button>
    <div className="page-title-row"><div><h1>غرفة المقابلة.</h1><p>قليل من الحوار. زاوية نظر جديدة. والقرار لك.</p></div><span className={`mode-pill ${interview.mode}`} >{interview.mode === 'sample' ? <FlaskConical size={14} /> : <Sparkles size={14} />}{interview.mode === 'sample' ? 'نسخة تجريبية مكتوبة' : localAI ? 'ذكاء اصطناعي محلي' : 'ذكاء اصطناعي مباشر'}</span></div>
    <div className="interview-layout">
      <aside className="applicant-profile">
        <div className="profile-art"><span className="paper-label">ملف المتقدّم</span><ObjectArt name={interview.facts.name} mood={mood} /><span className="profile-status"><span />{moodLabels[mood]}</span></div>
        <div className="profile-content"><h2 dir="auto">{interview.facts.name}</h2><p className="applicant-title" dir="auto">{interview.applicant.title}</p><div className="resume-section"><h3><BriefcaseBusiness size={14} />السيرة الذاتية</h3><dl><dt>آخر مرة أدّى فيها عمله</dt><dd>{lastUsedLabels[interview.facts.lastUsed]}</dd><dt>حالته الحالية</dt><dd>{conditionLabels[interview.facts.condition]}</dd><dt>الرابطة العاطفية</dt><dd dir="auto">{interview.facts.sentiment || 'لم تُذكر. ولا حاجة إلى تبرير.'}</dd></dl></div><div className="resume-section"><h3>نقاط قوّته كما يراها</h3><ul className="skills-list">{interview.applicant.skills.map((skill) => <li key={skill} dir="auto"><Check size={13} />{skill}</li>)}</ul></div><p className="resume-footnote">الطموحات من نسج الخيال.<br />أما التفاصيل أعلاه فمنك.</p></div>
      </aside>
      <section className="conversation-panel" aria-label="حوار المقابلة">
        <div className="conversation-header"><div><MessageCircle size={18} /><strong>لنستمع إلى ما لديه.</strong></div><span>الأسئلة المطروحة: {turns}</span></div>
        {interview.mode === 'sample' && <div className="sample-banner"><FlaskConical size={15} /><div><span>وضع تجريبي: ردود مكتوبة ومخصّصة لك، وليست ذكاءً اصطناعيًا مباشرًا. جرّب الأسئلة المقترحة.</span>{liveAvailable && <><p>{localAI ? 'يمكنك تفعيل ردود جديدة عبر Ollama على الجهاز الذي يشغّل التطبيق، دون خدمة سحابية.' : 'عند التفعيل تُرسل تفاصيل الغرض والمحادثة الأخيرة إلى OpenAI.'}</p><button className="button button-secondary" disabled={busy || !!pending} onClick={() => { onUpdate({ ...interview, mode: 'live' }); setError(''); }}>تفعيل المحادثة الذكية <Sparkles size={15} /></button></>}</div></div>}
        {checkingLive && <div className="sample-banner" role="status"><LoaderCircle size={15} className="spin" /><span>جارٍ التحقق من المحادثة…</span></div>}
        {interview.mode === 'live' && localAI && <div className="sample-banner"><Sparkles size={15} /><span>ردود مولّدة محليًا عبر Ollama، وليست نصوصًا جاهزة. اسأل بحرية؛ قد يستغرق الرد الأول بضع دقائق.</span></div>}
        <div className="messages" aria-live="polite" aria-relevant="additions" role="log" aria-label="رسائل المقابلة">
          {interview.messages.map((message, index) => <div className={`message ${message.role}`} key={index}>{message.role === 'assistant' && <div className="message-avatar"><ObjectArt name={interview.facts.name} mood={message.mood} /></div>}<div className="message-content"><span className="speaker" dir="auto">{message.role === 'assistant' ? interview.facts.name : 'أنت، مسؤول التوظيف'}{message.role === 'assistant' && message.mode === 'sample' && <small>تجريبي</small>}</span><p className="message-bubble" dir="auto">{message.text}</p></div></div>)}
          {pending && <div className="message user"><div className="message-content"><span className="speaker">أنت، مسؤول التوظيف</span><p className="message-bubble" dir="auto">{pending}</p></div></div>}
          {busy && <div className="typing-indicator" role="status"><span /><span /><span /><small>يراجع سيرته الذاتية القصيرة جدًا…</small></div>}
          <div ref={endRef} />
        </div>
        {error && <div className="interview-error" role="alert"><p>{error}</p>{pending && <button className="text-button" disabled={busy || checkingLive} onClick={() => void ask(pending)}>إعادة إرسال السؤال</button>}{interview.mode === 'live' && <button className="text-button" onClick={() => { onUpdate({ ...interview, mode: 'sample' }); setQuestion(pending); setPending(''); setError(''); }}>الانتقال إلى النموذج التجريبي</button>}</div>}
        {turns >= 3 && <div className="decision-nudge"><ClipboardList size={18} /><span>سمعت ما لديه. هل أنت مستعد لاتخاذ قرار؟</span><button onClick={onDecide}>احسم القرار <ChevronRight size={14} /></button></div>}
        <div className="conversation-input"><div className="suggested-questions">{questions.map((q) => <button key={q} disabled={busy || checkingLive || !!pending} onClick={() => void ask(q)}>{q}</button>)}</div><form onSubmit={submit} className="question-form"><label className="sr-only" htmlFor="interview-question">اسأل الشيء سؤالًا</label><input dir="auto" ref={inputRef} id="interview-question" maxLength={1000} placeholder="اطرح الأسئلة الصعبة…" value={question} onChange={(e) => setQuestion(e.target.value)} disabled={busy || checkingLive || !!pending} /><button type="submit" aria-label="إرسال السؤال" disabled={busy || checkingLive || !question.trim() || !!pending}>{busy ? <LoaderCircle size={20} className="spin" /> : <ArrowUp size={20} />}</button></form><p className="input-footnote">اسأل بفضول، لا بشعور بالذنب. لست ملزمًا بتوظيف أغراضك.</p></div>
      </section>
    </div>
    <div className="decision-bar"><div><strong>{decision ? 'القرار ليس حكمًا أبديًا.' : 'حوار مفيد. وخطوة تالية واضحة.'}</strong><p>{decision ? 'واصل الحوار، أو عدّل الخطة متى احتجت.' : 'احتفاظ، أو إصلاح، أو تبرّع، أو بيع. يمكنك أن تقرّر في أي وقت.'}</p></div><button className="button button-primary" onClick={onDecide}><ClipboardList size={18} />{decision ? 'تعديل القرار' : 'اتخذ قرارًا'}</button></div>
  </div>;
}
