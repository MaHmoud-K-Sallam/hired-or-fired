import { objectKind, type Mood } from '@/lib/model';

export function ObjectArt({ name = 'blender', mood = 'hopeful', className = '' }: { name?: string; mood?: Mood; className?: string }) {
  const kind = objectKind(name);
  const face = <g className={`object-face ${mood}`} stroke="#283B32" strokeWidth="3.4" strokeLinecap="round" fill="none"><g className="eyes"><path d="M85 110v5m28-5v5" /></g>{mood === 'nervous' ? <path d="M94 132q6-6 12 0" /> : mood === 'thoughtful' ? <path d="M94 130h11" /> : <path d="M91 127q9 12 18 0" />}<path d="m81 99 9 2m19 0 9-2" strokeWidth="2.2" /><ellipse cx="76" cy="122" rx="6" ry="3" fill="#E9927D" stroke="none" /><ellipse cx="123" cy="122" rx="6" ry="3" fill="#E9927D" stroke="none" /></g>;
  return <svg className={`object-art ${className}`} viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="102" cy="194" rx="66" ry="7" fill="#243C30" opacity=".09" />
    <g className="object-body" stroke="#283B32" strokeWidth="3.3" strokeLinejoin="round" strokeLinecap="round">
      {kind === 'blender' && <><path d="M137 53h17q18 0 18 19v29q0 15-24 17" strokeWidth="8" /><path d="m59 44 8 103h66l11-103Z" fill="#E3EEE5" /><path d="m70 49 7 83h13L84 49" fill="#fff" opacity=".6" stroke="none" /><path d="M60 80h81M130 69h8m-10 18h8m-10 18h8" opacity=".35" /><path d="M58 43q-3-13 8-13h72q12 0 10 13Z" fill="#456B59" /><path d="M86 24q15-12 29 0v6H86Z" fill="#456B59" /><path d="m68 148-12 32q-3 10 9 10h76q10 0 7-10l-13-32Z" fill="#729C7D" /><circle cx="102" cy="169" r="10" fill="#EBC66A" /><path d="M102 163v6" /><path d="m63 116-20 14-7-5m103-9 17 12 8-4M76 191l-7 8m57-8 7 8" />{face}</>}
      {kind === 'plant' && <><path d="M97 79V38q0-20 14-20t14 20v50" fill="#73986A" /><path d="M93 71H74q-19 0-19-21V37q0-13 11-13t11 13v11h19m29 14h10V45q0-12 11-12t11 12v22q0 20-32 20" fill="#73986A" /><path d="M110 30v45m-45-36v14m81-4v19" stroke="#D9E7BD" strokeWidth="2" /><path d="m63 91 10 88q2 13 15 13h40q14 0 16-13l10-88Z" fill="#DA9775" /><path d="M58 84q0-7 9-7h82q10 0 10 7v13H58Z" fill="#EDB48C" /><path d="m75 192-4 7m59-7 5 7M67 143l-19 7-5-5m102-2 16 8 7-6" />{face}</>}
      {kind === 'shoe' && <><path d="M38 138q11-9 18-24l13-55q4-13 19-6l36 20-12 30q4 13 23 24l28 13q13 5 13 27H34q-6-19 4-29Z" fill="#EEC776" /><path d="m81 66 30 15-8 20-27-14Z" fill="#F9E9C8" /><path d="m75 93 33 13m-37-1 35 13m-38-1 37 13" stroke="#FAF6E9" strokeWidth="7" /><path d="M35 159h140v15q-5 11-23 11H45q-15 0-14-15Z" fill="#FFF7E8" /><path d="M42 172h119M49 185l-6 10m95-10 7 10" /><g transform="translate(23 21) scale(.83)">{face}</g><path d="m35 138-12-10m144 20 15-5" /></>}
      {kind === 'camera' && <><rect x="37" y="67" width="130" height="107" rx="15" fill="#839A97" /><path d="m77 66 9-23h35l10 23" fill="#839A97" /><path d="M49 61h22v6H49Z" fill="#D5C195" /><rect x="49" y="83" width="23" height="12" rx="3" fill="#EBD7A8" /><circle cx="108" cy="124" r="37" fill="#3B504B" /><circle cx="108" cy="124" r="25" fill="#E1E9DC" /><path d="m38 128-14 14m143-14 13 12M72 176l-8 17m72-17 9 17" /><g transform="translate(33 45) scale(.72)">{face}</g></>}
      {kind === 'box' && <><path d="M46 65h109v112H46Z" fill="#D6AD78" /><path d="m46 65 20-24h69l20 24M88 65v32l12-7 12 7V65" fill="#EFCF9D" /><path d="M100 41v24m-54 78-17 10-6-5m132-5 15 10 7-5M72 178l-8 16m68-16 8 16" />{face}</>}
    </g>
  </svg>;
}

export function HeroScene() {
  return <div className="hero-scene" aria-label="خلاط ونبتة وحذاء ينتظرون مقابلات العمل" role="img">
    <div className="scene-speech">«طموحي أن أضيف للمائدة.<br /><span>عصيرًا، على الأغلب.»</span><span className="speech-tail" /></div>
    <svg className="scene-spark spark-one" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 2v32M2 18h32m-27-11 22 22M7 29 29 7" stroke="currentColor" strokeWidth="2" /></svg>
    <span className="scene-dot dot-one" /><span className="scene-dot dot-two" />
    <div className="scene-ground" /><div className="scene-plant"><ObjectArt name="plant" /></div><div className="scene-blender"><ObjectArt name="blender" /></div><div className="scene-shoe"><ObjectArt name="shoe" mood="nervous" /></div>
    <div className="tiny-resume"><div /><span>السيرة الذاتية</span><i /><i /><i /></div>
    <div className="scene-caption">أغراض واعدة. ومسيرة مهنية غامضة.</div>
  </div>;
}
