const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=value=>String(value).replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const signed=value=>value<0?`−${Math.abs(value)}`:value>0?`+${value}`:'0';
export function traitsMarkup(state){
 const a=state.player,names=new Map(state.entities.map(e=>[e.id,e.name])),name=id=>names.get(id)||label(id);
 const tendencies=Object.entries(a.tendencies).filter(([,count])=>count>0);
 const relationships=Object.entries(a.relationships),obligations=state.issues.filter(i=>i.actor==='player'&&i.status==='open');
 const section=(title,body)=>`<section class="traits-section"><h3>${title}</h3>${body}</section>`;
 return `<div class="traits-profile"><p class="traits-intro"><b>${escape(name('player'))}</b> · Your character develops through recorded actions and their consequences.</p>`+
 section('Current condition',`<dl class="traits-conditions"><div><dt>Health</dt><dd>${a.hp} / ${a.maxHp}</dd></div><div><dt>Fatigue</dt><dd>${a.fatigue} / 100</dd></div><div><dt>State</dt><dd>${escape(label(a.wakefulness))}</dd></div><div><dt>Mood</dt><dd>${escape(label(a.mood))}</dd></div></dl>`)+
 section('Developing tendencies',tendencies.length?`<p>Counts reflect distinct recorded actions.</p><ul>${tendencies.map(([category,count])=>`<li><strong>${escape(label(category))}</strong><span>${count} recorded action${count===1?'':'s'}</span></li>`).join('')}</ul>`:'<p>No tendencies recorded yet. Help someone or settle an obligation to begin building a history.</p>')+
 section('Developed capabilities',a.capabilities.length?`<p>Developed through repeated actions; available to your character when choosing an approach.</p><div class="traits-capabilities">${a.capabilities.map(value=>`<span>${escape(label(value))}</span>`).join('')}</div>`:'<p>No developed capabilities yet. Repeated care or settled obligations can establish them.</p>')+
 section('Actions behind your development',a.evidence.length?`<ol class="traits-evidence">${a.evidence.slice().reverse().map(e=>`<li><b>${escape(label(e.category))}</b><p>${escape(e.text)}</p></li>`).join('')}</ol>`:'<p>No supporting actions recorded yet. This section will show the events behind your development.</p>')+
 section('Your relationships',`<p>These are your character’s recorded trust and fear toward others.</p>${relationships.length?`<ul>${relationships.map(([id,r])=>`<li><strong>${escape(name(id))}</strong><span>Trust ${signed(r.trust)} · Fear ${signed(r.fear)}</span></li>`).join('')}</ul>`:'<p>No relationship changes recorded.</p>'}`)+
 section('Support & obligations',`<p>${a.permission?'Rowan’s support granted.':'Rowan’s support has not been granted yet.'}</p>${obligations.length?`<ul>${obligations.map(issue=>`<li><strong>${escape(name(issue.entity))}</strong><span>${issue.amount} coins owed to ${escape(name(issue.owner))}</span></li>`).join('')}</ul>`:'<p>No open obligations recorded for you.</p>'}`)+'</div>';
}
