export const SCHEMA_VERSION = 2;

export const TAXONOMY = {
  information_seeking:{label:'Information seeking', cues:['what is','what are','define ','explain ','tell me about','how do i']},
  mechanism_seeking:{label:'Mechanism seeking', cues:['why does','why do','how does','mechanism','how .* work']},
  clarification:{label:'Clarification', cues:['wait','does that mean','so you mean','clarify','what do you mean']},
  constraint_setting:{label:'Constraint setting', cues:['under ','within ','budget','cannot ',"can't ",'must ','only have','limited to','no more than']},
  comparison:{label:'Comparison', cues:['which .* better','compare','versus',' vs ','difference between','pros and cons']},
  causal_reasoning:{label:'Causal reasoning', cues:['cause','effect','lead to','result in','impact','affect']},
  counterfactual:{label:'Counterfactual', cues:['what if','would .* if','suppose ','if .* then']},
  counterargument:{label:'Counterargument', cues:['yeah but','but wouldn','however','counterargument','on the other hand']},
  decomposition:{label:'Decomposition', cues:['break .* down','step by step','parts','component','first.*then']},
  optimization:{label:'Optimization', cues:['best ','optimal','optimize','maximize','minimize','most efficient','strategy']},
  second_order:{label:'Second-order effects', cues:['after that','then what','second.order','downstream','ripple effect','long.term']},
  synthesis:{label:'Synthesis', cues:['connect','combine','together','across','relationship between','how .* relate']},
  self_modeling:{label:'Self-modeling', cues:['about me','my habits','my behavior','myself','what does this say about']},
  meta_reasoning:{label:'Meta-reasoning', cues:['how am i thinking','my reasoning','thinking process','reasoning style','my decision making']},
  decision_closure:{label:'Decision closure', cues:['i will ',"i'll ",'decided','choose ','going with','final decision']}
};

const MAX_CONVERSATIONS = 100000;
const FOLLOW_UPS = new Map([['why?','mechanism_seeking'],['why','mechanism_seeking'],['how so?','mechanism_seeking'],['which one?','comparison'],['then what?','second_order'],['and if','counterfactual']]);
const NEGATED = [/^don['’]t compare\b/i,/\bwhy would someone say\b/i,/\bthe phrase ['”"]?what if/i];

const toText = content => {
  if (!content) return '';
  if (Array.isArray(content.parts)) return content.parts.filter(x=>typeof x==='string').join('\n');
  if (typeof content.text === 'string') return content.text;
  if (Array.isArray(content)) return content.filter(x=>typeof x==='string').join('\n');
  return typeof content === 'string' ? content : '';
};

export const normalizeText = text => String(text || '').replace(/\s+/g,' ').trim();

export function redact(text){
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<]+/gi,'[url]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[ip]')
    .replace(/\b(?:\+?1[-. ]?)?(?:\(?\d{3}\)?[-. ]?)\d{3}[-. ]?\d{4}\b/g,'[phone]')
    .replace(/\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]{2,}\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,'[address]')
    .replace(/(?<!\w)@[a-z0-9_]{2,}/gi,'[handle]')
    .replace(/\b(?:acct|account|customer|user|order)[ _:#-]*\d{5,}\b/gi,'[account-id]');
}

export function classifyDetailed(text, context=''){
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized || NEGATED.some(rule=>rule.test(normalized))) return {labels:[],confidence:{},reasons:{}};
  const labels=[], confidence={}, reasons={};
  for (const [key, definition] of Object.entries(TAXONOMY)) {
    const matches=definition.cues.filter(cue=>new RegExp(cue,'i').test(normalized));
    if (!matches.length) continue;
    labels.push(key);
    confidence[key]=matches.length>1 ? 'strong' : normalized.length<18 ? 'weak' : 'probable';
    reasons[key]=matches.map(cue=>`Matched cue: "${cue}"`);
  }
  if (normalized.length<=18 && context) {
    for (const [cue,label] of FOLLOW_UPS) if (normalized===cue || normalized.startsWith(cue)) {
      if (!labels.includes(label)) labels.push(label);
      confidence[label]='probable';
      reasons[label]=[`Contextual follow-up: "${cue}"`, 'Prior user turn retained for audit'];
    }
  }
  return {labels,confidence,reasons};
}

export function classify(text){ return classifyDetailed(text).labels; }

const roleFor = message => message?.author?.role || message?.role || (typeof message?.author === 'string' ? message.author : null);
const parentFor = node => node?.parent || node?.parent_id || node?.parentId || node?.message?.parent || node?.message?.parent_id;
export function contextFor(nodes, node){
  let parent=nodes[parentFor(node)];
  let hops=0;
  while(parent && (!parent.message || roleFor(parent.message)!=='user') && hops++<50) parent=nodes[parentFor(parent)];
  return parent?.message ? redact(toText(parent.message.content ?? parent.message.text)).slice(0,280) : null;
}

export function parseConversations(json){
  const conversations=(Array.isArray(json)?json:(Array.isArray(json?.conversations)?json.conversations:[json])).flat(Infinity).filter(Boolean);
  if (conversations.length>MAX_CONVERSATIONS) throw Error('Too many conversations in this export.');
  const out=[];
  for(const convo of conversations){
    if(typeof convo!=='object') continue;
    const nodes=convo.mapping&&typeof convo.mapping==='object' ? convo.mapping : Object.fromEntries((Array.isArray(convo.messages)?convo.messages:[]).slice(0,MAX_CONVERSATIONS).map((message,index)=>[message.id||message.message_id||String(index),{message,parent:message.parent||message.parent_id||message.parentId}]));
    for(const [nodeId,node] of Object.entries(nodes)){
      const message=node?.message||node;
      if(roleFor(message)!=='user') continue;
      const rawText=toText(message.content ?? message.text).trim();
      if(!rawText) continue;
      const timestamp=message.create_time||node?.create_time||convo.update_time||convo.create_time;
      if(!timestamp) continue;
      const date=new Date(typeof timestamp==='number'?timestamp*1000:timestamp);
      if(Number.isNaN(date.valueOf())) continue;
      const context=contextFor(nodes,node);
      const detail=classifyDetailed(rawText,context);
      out.push({schemaVersion:SCHEMA_VERSION,id:`${convo.id||convo.conversation_id||convo.uuid||'conversation'}:${nodeId}`,conversationId:convo.id||convo.conversation_id||convo.uuid||'unknown',title:redact(convo.title||convo.name||'Untitled').slice(0,90),timestamp:date.toISOString(),month:date.toISOString().slice(0,7),text:redact(rawText),normalizedText:normalizeText(rawText),context,labels:detail.labels,confidence:detail.confidence,reasons:detail.reasons});
    }
  }
  return out.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}

export function aggregate(records){
  const months=[...new Set(records.map(r=>r.month))].sort();
  const totals=Object.fromEntries(Object.keys(TAXONOMY).map(k=>[k,0]));
  const byMonth=Object.fromEntries(months.map(m=>[m,{total:0,labels:Object.fromEntries(Object.keys(TAXONOMY).map(k=>[k,0]))}]));
  for(const record of records){ if(!byMonth[record.month]) continue; byMonth[record.month].total++; for(const label of record.labels){if(label in totals){totals[label]++;byMonth[record.month].labels[label]++;}} }
  return {months,totals,byMonth};
}

export function inferences(result){
  const {months,byMonth}=result;
  if(months.length<4) return [];
  const cut=Math.ceil(months.length/2), earlyMonths=months.slice(0,cut), lateMonths=months.slice(cut);
  const total=set=>set.reduce((sum,month)=>sum+byMonth[month].total,0);
  const earlyN=total(earlyMonths),lateN=total(lateMonths);
  if(earlyN<20||lateN<20) return [];
  const rate=(set,label)=>set.reduce((sum,month)=>sum+byMonth[month].labels[label],0)/Math.max(1,total(set));
  return Object.keys(TAXONOMY).map(key=>{const early=rate(earlyMonths,key),late=rate(lateMonths,key),delta=late-early,relative=early?delta/early:null;const strength=Math.abs(delta)>=.08&&Math.max(early,late)>=.08?'moderate':'early signal';return {key,delta,early,late,relative,earlyN,lateN,strength};}).filter(item=>Math.abs(item.delta)>=.025).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,3);
}
