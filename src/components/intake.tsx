'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, FlaskConical, LoaderCircle, LockKeyhole } from 'lucide-react';
import { conditionLabels, conditionOptions, lastUsedLabels, lastUsedOptions, objectSchema, type ObjectFacts } from '@/lib/model';
import { Modal } from './modal';

export function Intake({ onClose, onSubmit, liveAvailable, localAI, checkingAI }: { onClose: () => void; onSubmit: (facts: ObjectFacts, mode: 'sample' | 'live', signal: AbortSignal) => Promise<void>; liveAvailable: boolean; localAI: boolean; checkingAI: boolean }) {
  const [name, setName] = useState('');
  const [lastUsed, setLastUsed] = useState('');
  const [condition, setCondition] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [preferSample, setSample] = useState(false);
  const sample = preferSample || !liveAvailable;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || checkingAI) return;
    const result = objectSchema.safeParse({ name, lastUsed, condition, sentiment });
    if (!result.success) { setError('اكتب اسم الشيء المتقدّم، وحدّد آخر مرة استخدمته فيها وحالته. «لا أتذكر» إجابة مقبولة تمامًا.'); return; }
    setBusy(true); setError('');
    const controller = new AbortController(); requestRef.current = controller;
    try { await onSubmit(result.data, sample ? 'sample' : 'live', controller.signal); }
    catch { if (!controller.signal.aborted) setError('مساعد التوظيف بالذكاء الاصطناعي غير متاح الآن. حاول مجددًا، أو اختر المقابلة التجريبية الموضّحة أدناه.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <Modal title="تعرّف على المتقدّم الجديد." onClose={onClose}>
    <p className="modal-intro">بعض التفاصيل الصادقة. وسيرة ذاتية طموحة جدًا.</p>
    <form onSubmit={submit} className="intake-form">
      <label>ما الشيء المتقدّم للوظيفة؟<input dir="auto" autoFocus required maxLength={80} placeholder="مثلًا: آلة الوافل التي علّقت عليها آمالًا كبيرة" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="form-columns"><label>متى استخدمته آخر مرة؟<select required value={lastUsed} onChange={(e) => setLastUsed(e.target.value)}><option value="">بكل صراحة، لا أحكام هنا.</option>{lastUsedOptions.map((value) => <option key={value} value={value}>{lastUsedLabels[value]}</option>)}</select></label>
      <label>ما حالته؟<select required value={condition} onChange={(e) => setCondition(e.target.value)}><option value="">اختر حالته</option>{conditionOptions.map((value) => <option key={value} value={value}>{conditionLabels[value]}</option>)}</select></label></div>
      <label>هل له قيمة عاطفية؟ <span className="optional">اختياري</span><textarea dir="auto" rows={3} maxLength={500} placeholder="هدية، أو ذكرى، أو مجرد رفيق لطيف…" value={sentiment} onChange={(e) => setSentiment(e.target.value)} /><span className="field-help">لا تحتاج الذكريات إلى إثبات جدارتها بالبقاء. سنعاملها بلطف.</span></label>
      <div className="mode-notice"><FlaskConical size={20} /><div><strong>{checkingAI ? 'جارٍ التحقق من المحادثة…' : sample ? 'مقابلة تجريبية' : localAI ? 'ذكاء اصطناعي محلي' : 'ذكاء اصطناعي مباشر'}</strong><p>{checkingAI ? 'نتحقق من جاهزية مساعدك قبل بدء المقابلة.' : sample ? 'ردود مرحة مكتوبة مسبقًا ومخصّصة بتفاصيلك، وليست محادثة مباشرة مع الذكاء الاصطناعي.' : localAI ? 'تُعالج التفاصيل على الجهاز الذي يشغّل التطبيق عبر Ollama، دون إرسالها إلى خدمة سحابية. قد يستغرق الرد الأول بضع دقائق لتحميل النموذج.' : 'تُرسل تفاصيل غرضك والمحادثة إلى OpenAI. يُحفظ السجل في هذا المتصفح فقط.'}</p></div></div>
      {liveAvailable && <label className="check-label"><input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} />استخدم النسخة التجريبية المكتوبة بدلًا من الذكاء الاصطناعي المباشر</label>}
      {!checkingAI && !liveAvailable && <p className="field-help">{localAI ? 'افتح Ollama وتأكد من تنزيل النموذج المحدّد، ثم أعد تحميل الصفحة لتفعيل المحادثة الذكية. يمكنك تجربة الردود المكتوبة الآن.' : 'لم يُعَدّ الذكاء الاصطناعي المباشر على هذا الخادم. ما زالت جميع خطوات اتخاذ القرار متاحة.'}</p>}
      {error && <div className="error-notice" role="alert">{error}{!sample && <button type="button" className="text-button" onClick={() => { setSample(true); setError(''); }}>الانتقال إلى النموذج التجريبي</button>}</div>}
      <button className="button button-primary full-width" type="submit" disabled={busy || checkingAI}>{checkingAI ? <><LoaderCircle className="spin" size={18} />جارٍ التحقق من المحادثة…</> : busy ? <><LoaderCircle className="spin" size={18} />جارٍ إعداد سيرته الذاتية…</> : <>ابدأ المقابلة <ArrowRight size={18} /></>}</button>
      <p className="privacy-note"><LockKeyhole size={13} />لا حسابات ولا أحكام. القرار الأخير لك.</p>
    </form>
  </Modal>;
}
