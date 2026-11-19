'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CheckCheck, Copy, HeartHandshake, Home, ShoppingBag, Stamp, Wrench } from 'lucide-react';
import { actionSummary, decisionLetter, decisionSchema, makeListing, type Decision, type DecisionInput, type Interview, type Outcome } from '@/lib/model';
import { Modal } from './modal';

export const outcomes = [
  { value: 'keep', label: 'احتفاظ', subtitle: 'امنحه عملًا حقيقيًا', Icon: Home },
  { value: 'repair', label: 'إصلاح', subtitle: 'خطّط لعودته', Icon: Wrench },
  { value: 'donate', label: 'تبرّع', subtitle: 'ابحث له عن فريق جديد', Icon: HeartHandshake },
  { value: 'sell', label: 'بيع', subtitle: 'اكتب بداية فصله القادم', Icon: ShoppingBag },
] as const;

export function DecisionDialog({ interview, existing, onClose, onSave, viewLetter = false }: { interview: Interview; existing?: Decision; onClose: () => void; onSave: (decision: DecisionInput) => void; viewLetter?: boolean }) {
  const [outcome, setOutcome] = useState<Outcome>(existing?.outcome ?? 'keep');
  const [use, setUse] = useState(existing?.outcome === 'keep' ? existing.use : '');
  const [location, setLocation] = useState(existing?.outcome === 'keep' ? existing.location : '');
  const [repair, setRepair] = useState(existing?.outcome === 'repair' ? existing.repair : '');
  const [nextStep, setNextStep] = useState(existing?.outcome === 'repair' ? existing.nextStep : '');
  const [destination, setDestination] = useState(existing?.outcome === 'donate' ? existing.destination : '');
  const [title, setTitle] = useState(existing?.outcome === 'sell' ? existing.title : interview.facts.name);
  const [listing, setListing] = useState(existing?.outcome === 'sell' ? existing.listing : makeListing(interview.facts));
  const [price, setPrice] = useState(existing?.outcome === 'sell' ? existing.price : '');
  const [saved, setSaved] = useState<DecisionInput | null>(viewLetter && existing ? existing : null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = decisionSchema.safeParse({ outcome, use, location, repair, nextStep, destination, title, listing, price });
    if (!result.success) { setError('أكمل تفاصيل الخطوة التالية ليخرج هذا القرار من المكتب إلى التنفيذ.'); return; }
    onSave(result.data); setSaved(result.data);
  }
  async function copyListing() {
    if (saved?.outcome !== 'sell') return;
    try { await navigator.clipboard.writeText(`${saved.title}\n\n${saved.listing}${saved.price ? `\n\nالسعر المطلوب (تحدّده أنت): ${saved.price}` : ''}`); setCopied(true); }
    catch { setError('الحافظة غير متاحة. حدّد نص المسودة أدناه وانسخه.'); }
  }
  return <Modal title={saved ? 'أصبح القرار رسميًا.' : existing ? 'تغيير في الخطة؟' : 'أنت صاحب القرار.'} onClose={onClose} wide>
    {saved ? <div className="decision-result">
      <div className={`letter outcome-${saved.outcome}`}><div className="letter-letterhead"><span>توظيف أم تسريح؟<small>إدارة تقليل الأغراض</small></span><Stamp size={27} /></div><span className={`decision-stamp ${saved.outcome}`}>{saved.outcome === 'keep' ? 'تم التوظيف!' : saved.outcome === 'repair' ? 'تمت الموافقة على العودة' : saved.outcome === 'donate' ? 'فرص جديدة' : 'بانتظار العروض'}</span><p className="letter-body" dir="auto">{decisionLetter(interview.facts.name, saved.outcome)}</p><p className="letter-signature">مسؤول التوظيف <span>(هذا أنت)</span></p></div>
      <div className="next-action"><CheckCheck size={23} /><div><h3>حان وقت التنفيذ.</h3><p dir="auto">{actionSummary(saved)}</p>{saved.outcome === 'donate' && <small>أُضيف إلى قائمة التبرّعات. تأكّد من قبول الجهة له قبل تسليمه.</small>}{saved.outcome === 'sell' && <small>هذه مسودة فقط. راجع كل التفاصيل قبل مشاركتها. لا يُنشر شيء تلقائيًا.</small>}</div></div>
      {saved.outcome === 'sell' && <div className="listing-preview"><label>مسودة إعلانك<textarea dir="auto" readOnly rows={6} value={`${saved.title}\n\n${saved.listing}${saved.price ? `\n\nالسعر المطلوب (تحدّده أنت): ${saved.price}` : ''}`} /></label><button className="button button-secondary" onClick={copyListing}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'تم النسخ' : 'نسخ الإعلان'}</button></div>}
      {error && <p className="error-notice" role="alert">{error}</p>}
      <p className="field-help">أُضيف قرارك إلى اللوحة. يمكنك تعديله أو مواصلة المقابلة.</p>
      <div className="dialog-actions"><button className="button button-secondary" onClick={() => { setSaved(null); setError(''); }}>تعديل القرار</button><button className="button button-primary" onClick={onClose}>العودة إلى المكتب <ArrowRight size={17} /></button></div>
    </div> : <form onSubmit={submit}>
      <p className="modal-intro">ما الخطوة التالية لـ <strong dir="auto">{interview.facts.name}</strong>؟ كل قرار مناسب لك هو قرار جيد.</p>
      <fieldset className="outcome-options"><legend className="sr-only">اختر النتيجة</legend>{outcomes.map(({ value, label, subtitle, Icon }) => <label key={value} className={`outcome-option ${outcome === value ? `selected ${value}` : ''}`}><input type="radio" name="outcome" value={value} checked={outcome === value} onChange={() => { setOutcome(value); setError(''); }} /><Icon size={22} /><strong>{label}</strong><span>{subtitle}</span></label>)}</fieldset>
      <div className="decision-fields">
        {outcome === 'keep' && <><label>ما المهمة المحدّدة التي سيؤدّيها؟<input dir="auto" required maxLength={300} value={use} onChange={(e) => setUse(e.target.value)} placeholder="مثلًا: إعداد الوافل صباح الجمعة" /></label><label>أين سيكون مكانه؟<input dir="auto" required maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثلًا: رف المطبخ الذي يسهل الوصول إليه" /></label></>}
        {outcome === 'repair' && <><label>ما الذي يحتاج إلى إصلاح؟<input dir="auto" required maxLength={300} value={repair} onChange={(e) => setRepair(e.target.value)} placeholder="مثلًا: المقبض المرتخي" /></label><label>ما خطوتك التالية؟<input dir="auto" required maxLength={300} value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="مثلًا: طلب فحصه في ورشة الإصلاح يوم السبت" /></label></>}
        {outcome === 'donate' && <><label>أين تنتظره فرصته القادمة؟<input dir="auto" required maxLength={300} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="مثلًا: حملة التبرّعات في المركز المجتمعي" /></label><div className="gentle-note"><HeartHandshake size={19} /><p>سنضيفه إلى قائمة التبرّعات. تأكّد من أن الجهة المستقبلة تقبله بحالته الحالية قبل تجهيزه.</p></div></>}
        {outcome === 'sell' && <><label>عنوان الإعلان<input dir="auto" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>مسودة الإعلان القابلة للتعديل<textarea dir="auto" required rows={6} maxLength={2500} value={listing} onChange={(e) => setListing(e.target.value)} /></label><label>السعر المطلوب <span className="optional">اختياري · تحدّده أنت</span><input dir="auto" maxLength={50} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="اتركه فارغًا حتى تقارن بأغراض مشابهة" /></label><p className="field-help">تتضمّن المسودة معلوماتك المؤكّدة فقط. راجعها وأضف تفاصيل تحقّقت منها. لا نقدّر الأسعار ولا ننشر الإعلانات.</p></>}
      </div>
      {error && <p className="error-notice" role="alert">{error}</p>}
      {existing && <p className="field-help">سيُحدَّث القرار الحالي، ولن يُضاف قرار آخر.</p>}
      <button className="button button-primary full-width" type="submit">{existing ? 'تحديث القرار' : 'اعتماد القرار'} <Stamp size={18} /></button>
    </form>}
  </Modal>;
}
