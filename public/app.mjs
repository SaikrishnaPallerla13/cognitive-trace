import { TAXONOMY, parseConversations, aggregate, inferences } from './core.mjs';
import { unzipEntries } from './archive.mjs';
import { DEMO_CONVERSATIONS } from './demo.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const descriptions = {
  information_seeking:'Asks for facts, definitions, or instructions.', mechanism_seeking:'Asks how or why something works.', clarification:'Checks or narrows an earlier point.', constraint_setting:'Names a limit, condition, or requirement.', comparison:'Weighs alternatives or contrasts options.', causal_reasoning:'Connects a cause, effect, impact, or consequence.', counterfactual:'Explores an alternative condition.', counterargument:'Challenges or qualifies a prior point.', decomposition:'Breaks a problem into parts or steps.', optimization:'Seeks a best or most efficient choice.', second_order:'Asks about downstream or later effects.', synthesis:'Connects ideas, domains, or factors.', self_modeling:'Asks about personal habits or behavior.', meta_reasoning:'Reflects on the reasoning process itself.', decision_closure:'States or settles on a choice.'
};
let allRecords = [], records = [], evidenceIndex = 0;

function selectedRange() {
  const months = allRecords.map(record => record.month).filter(Boolean).sort();
  return { from: $('#date-from').value || months[0] || '', to: $('#date-to').value || months.at(-1) || '' };
}

function filterRecords() {
  const { from, to } = selectedRange();
  records = allRecords.filter(record => (!from || record.month >= from) && (!to || record.month <= to));
  return aggregate(records);
}

function populateDateFilter() {
  const months = allRecords.map(record => record.month).filter(Boolean).sort();
  const first = months[0] || '', last = months.at(-1) || '';
  for (const control of [$('#date-from'), $('#date-to')]) { control.min = first; control.max = last; }
  $('#date-from').value = first; $('#date-to').value = last;
}

function renderTimeline(data) {
  const key = $('#move-filter').value;
  const values = data.months.map((_, index) => {
    const window = data.months.slice(Math.max(0, index - 2), index + 1);
    const labels = window.reduce((sum, month) => sum + data.byMonth[month].labels[key], 0);
    const total = window.reduce((sum, month) => sum + data.byMonth[month].total, 0);
    return labels / Math.max(1, total);
  });
  const max = Math.max(.01, ...values), width = Math.max(620, data.months.length * 42), left = 42, right = 12, top = 20, height = 168;
  const step = (width - left - right) / Math.max(1, data.months.length - 1), y = value => top + height - value / max * height;
  const points = values.map((value, index) => `${left + index * step},${y(value)}`).join(' ');
  const dots = values.map((value, index) => `<circle class="timeline-dot" cx="${left + index * step}" cy="${y(value)}" r="3"><title>${data.months[index]}: ${Math.round(value * 100)}% rolling rate</title></circle>`).join('');
  const labels = data.months.map((month, index) => index % 3 === 0 || index === data.months.length - 1 ? `<text class="timeline-label" x="${left + index * step}" y="${top + height + 31}" text-anchor="middle">${month}</text>` : '').join('');
  const peak = Math.max(...values), peakMonth = data.months[values.indexOf(peak)], { from, to } = selectedRange();
  $('#timeline-title').textContent = `${TAXONOMY[key].label} wording`;
  $('#timeline-note').textContent = `Current period: ${from || 'start'} to ${to || 'end'}. Three-month rolling rate; peak ${peakMonth || '—'} (${Math.round(peak * 100)}%). Months with no dated messages remain visible as gaps.`;
  $('#timeline').innerHTML = `<svg viewBox="0 0 ${width} 250" role="img" aria-label="${TAXONOMY[key].label} rate over time"><line class="gridline" x1="${left}" y1="${top}" x2="${width-right}" y2="${top}"></line><line class="axis" x1="${left}" y1="${top+height}" x2="${width-right}" y2="${top+height}"></line><text class="timeline-label" x="2" y="${top+5}">${Math.round(max*100)}%</text><text class="timeline-label" x="17" y="${top+height+4}">0</text><polyline class="timeline-line" points="${points}"></polyline>${dots}${labels}</svg>`;
}

function renderPie(data) {
  const items = Object.entries(data.totals).filter(([, count]) => count).sort((a,b) => b[1] - a[1]);
  const total = items.reduce((sum, [, count]) => sum + count, 0), colors = ['#77a5a7','#c36e42','#e0b156','#82796b','#5b7376','#a1846b','#9aa57c','#a47d87','#668794','#bd8b50','#a4998b','#6e9b96','#d0955b','#7b718a','#bd7470'];
  const circumference = 2 * Math.PI * 72; let offset = 0;
  const slices = items.map(([key, count], index) => { const length = count / Math.max(1,total) * circumference; const slice = `<circle cx="95" cy="95" r="72" fill="none" stroke="${colors[index % colors.length]}" stroke-width="30" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 95 95)"><title>${TAXONOMY[key].label}: ${count.toLocaleString()} labels</title></circle>`; offset += length; return slice; }).join('');
  $('#pie-chart').innerHTML = total ? `<div class="pie" role="img" aria-label="Distribution of ${total.toLocaleString()} reasoning-move labels"><svg viewBox="0 0 190 190" aria-hidden="true"><circle cx="95" cy="95" r="72" fill="none" stroke="#39342c" stroke-width="30"></circle>${slices}</svg><span>${total.toLocaleString()}<small>rule matches</small></span></div>` : '<p class="caption">No labels to chart in this period.</p>';
  $('#label-total').textContent = total ? `Counts for the selected period. ${total.toLocaleString()} total rule matches; hover a segment for its category and count.` : '';
  const max = Math.max(...items.map(([, count]) => count), 1);
  $('#distribution').innerHTML = items.map(([key,count]) => `<div class="row"><span>${TAXONOMY[key].label}</span><div class="track"><div class="fill" style="width:${count/max*100}%"></div></div><strong>${count}</strong></div>`).join('') || '<p class="caption">No explicit rule matches in this period.</p>';
}

function evidenceSample() {
  const filter = $('#evidence-filter').value;
  const source = records.filter(record => record.labels.length && (filter === 'all' || record.labels.includes(filter)));
  const third = Math.ceil(source.length / 3), pick = items => items.length <= 8 ? items : Array.from({length:8}, (_, index) => items[Math.round(index * (items.length - 1) / 7)]), seen = new Set();
  return [...pick(source.slice(0,third)), ...pick(source.slice(third,third*2)), ...pick(source.slice(third))].filter(record => { if (seen.has(record.conversationId)) return false; seen.add(record.conversationId); return true; });
}

function renderEvidence() {
  const subset = evidenceSample(), controls = $('#evidence-controls');
  if (!subset.length) { $('#evidence').innerHTML = '<p class="caption">No matching local evidence in this period.</p>'; controls.hidden = true; return; }
  evidenceIndex = Math.min(Math.max(0, evidenceIndex), subset.length - 1);
  const record = subset[evidenceIndex], preview = record.text.length > 700 ? `${record.text.slice(0,700).trim()}…` : record.text;
  const why = record.labels.map(label => `<li><strong>${TAXONOMY[label].label}</strong> (${record.confidence?.[label] || 'rule match'}): ${(record.reasons?.[label] || ['Matched explicit language cue.']).map(esc).join('; ')}</li>`).join('');
  const full = record.text.length > 700 ? `<details class="full-excerpt"><summary>Show the full local excerpt</summary><p class="excerpt">${esc(record.text)}</p></details>` : '';
  $('#evidence').innerHTML = `<article class="evidence"><p class="section-marker">${record.month} · ${esc(record.title)}</p><div class="labels">${record.labels.map(label => `<span class="tag">${TAXONOMY[label].label}</span>`).join('')}</div>${record.context ? `<p class="caption">Prior user turn: ${esc(record.context)}</p>` : ''}<p class="excerpt">${esc(preview)}</p><details class="classification-why"><summary>Why it appears here</summary><ul>${why}</ul></details>${full}</article>`;
  controls.hidden = false; $('#evidence-position').textContent = `${evidenceIndex + 1} / ${subset.length}`; $('#evidence-prev').disabled = evidenceIndex === 0; $('#evidence-next').disabled = evidenceIndex === subset.length - 1;
  $('#evidence-prev').onclick = () => { evidenceIndex--; renderEvidence(); }; $('#evidence-next').onclick = () => { evidenceIndex++; renderEvidence(); };
}

function render(data) {
  const labelled = records.filter(record => record.labels.length), conversationCount = new Set(records.map(record => record.conversationId)).size, { from, to } = selectedRange();
  $('#welcome').hidden = true; $('#dashboard').hidden = false; $('#delete').disabled = false;
  $('#summary').innerHTML = `<strong>${records.length.toLocaleString()}</strong> dated user messages across <strong>${conversationCount.toLocaleString()}</strong> conversations, from <strong>${from || '—'}</strong> to <strong>${to || '—'}</strong>. <strong>${labelled.length.toLocaleString()}</strong> messages (${records.length ? Math.round(labelled.length / records.length * 100) : 0}%) contain at least one explicit rule cue.`;
  $('#move-filter').innerHTML = Object.keys(TAXONOMY).map(key => `<option value="${key}">${TAXONOMY[key].label}</option>`).join('');
  $('#evidence-filter').innerHTML = ['<option value="all">all moves</option>', ...Object.keys(TAXONOMY).map(key => `<option value="${key}">${TAXONOMY[key].label}</option>`)].join('');
  $('#taxonomy-guide').innerHTML = Object.keys(TAXONOMY).map(key => `<div><strong>${TAXONOMY[key].label}</strong><p>${descriptions[key]}</p></div>`).join('');
  const findings = inferences(data);
  $('#inferences').innerHTML = findings.map(item => `<article class="inference"><p class="section-marker warning">${item.strength.toUpperCase()}</p><strong>${TAXONOMY[item.key].label}</strong> appeared ${item.delta > 0 ? 'more' : 'less'} often across comparable periods (${Math.round(item.early*100)}% → ${Math.round(item.late*100)}%; ${item.earlyN} vs ${item.lateN} messages). This is an observed wording-pattern difference, not evidence of a trait or ability change.</article>`).join('') || '<p class="caption">This period does not have enough repeated dated messages in both halves for a careful change comparison.</p>';
  renderPie(data); renderTimeline(data); renderEvidence();
  $('#move-filter').onchange = () => renderTimeline(data); $('#evidence-filter').onchange = () => { evidenceIndex = 0; renderEvidence(); };
}

function applyDateFilter() {
  const from = $('#date-from').value, to = $('#date-to').value;
  if (from && to && from > to) { $('#status').textContent = 'Choose an end month that is the same as or later than the start month.'; return; }
  $('#status').textContent = ''; evidenceIndex = 0; render(filterRecords());
}

async function load(file) {
  $('#status').textContent = 'Reading the ZIP locally…';
  try { const files = await unzipEntries(file); allRecords = parseConversations(files); if (!allRecords.length) throw Error(`Found ${files.length} conversation JSON file(s), but no dated user-authored text messages. This export may use a format this MVP does not yet support.`); populateDateFilter(); applyDateFilter(); }
  catch (error) { $('#status').textContent = `Could not analyze this file: ${error.message}`; }
}

$('#zip').onchange = event => event.target.files[0] && load(event.target.files[0]);
$('#demo').onclick = () => { allRecords = parseConversations(DEMO_CONVERSATIONS); populateDateFilter(); applyDateFilter(); };
$('#date-filter').onsubmit = event => { event.preventDefault(); applyDateFilter(); };
$('#date-reset').onclick = () => { populateDateFilter(); applyDateFilter(); };
$('#delete').onclick = () => { allRecords = []; records = []; evidenceIndex = 0; $('#dashboard').hidden = true; $('#welcome').hidden = false; $('#delete').disabled = true; $('#zip').value = ''; $('#status').textContent = 'Analysis deleted from page memory.'; };
