(function(){
'use strict';

const oldHH=document.getElementById('simulatorChart');
if(oldHH){const p=oldHH.closest('.panel');if(p)p.remove();}
const old=document.getElementById('quantitySimulatorPanel');
if(old)old.remove();

const $=id=>document.getElementById(id);
const A=v=>Array.isArray(v)?v.filter(Boolean):(v&&typeof v==='object'?Object.values(v).filter(Boolean):[]);
const N=v=>{if(typeof v==='number')return isFinite(v)?v:0;let s=String(v??'').trim();if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');let n=Number(s);return isFinite(n)?n:0};
const T=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const F=(v,d=2)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const hasOwn=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const P=()=>PROJECTS.find(x=>x.id===state.simulatorProjectId)||null;
const M=p=>projectMetrics(p||P());

const svc=r=>r?.Servico??r?.['Serviço']??r?.servico??'';
const disc=r=>r?.Disciplina??r?.disciplina??'';
const un=r=>r?.Un??r?.un??r?.Unidade??r?.unidade??'';
const dt=r=>parseDate(r?.Data??r?.data??r?.Date);
const real=r=>N(r?.Real_Dia??r?.Real??r?.real);
const prev=r=>N(r?.Previsto_Dia??r?.Previsto??r?.previsto);
const proj=r=>N(r?.Project??r?.Projeto??r?.quantidade??r?.Quantidade);

function regs(raw){
  let q=raw?.quantitativosGerais??raw?.quantitativos;
  if(q&&q.registros!=null)q=q.registros;
  else if(q&&q.itens!=null)q=q.itens;
  return A(q).filter(r=>svc(r)||proj(r)||real(r)||prev(r));
}
function cat(raw){
  let q=raw?.cadastroQuantitativos??raw?.quantitativosCadastro;
  if(q&&q.registros!=null)q=q.registros;
  else if(q&&q.itens!=null)q=q.itens;
  return A(q);
}
function key(projectId,d,s,u){return [T(projectId),T(d),T(s),T(u)].join('|')}
function sameRecord(r,x){
  if(T(svc(r))!==T(x.s))return false;
  if(x.d&&disc(r)&&T(disc(r))!==T(x.d))return false;
  if(x.u&&un(r)&&T(un(r))!==T(x.u))return false;
  return true;
}
function items(project,raw){
  const rr=regs(raw),out=[],used=new Set();
  cat(raw).forEach(c=>{
    const x={projectId:project.id,id:c.id||'',d:c.disciplina??c.Disciplina??'',s:c.servico??c.Servico??c['Serviço']??'',u:c.un??c.Un??c.unidade??c.Unidade??'',total:N(c.quantidade??c.Project??c.Projeto??c.total),idx:N(c.indiceHH??c.indice??c.IndiceHH),rs:[]};
    if(!x.s)return;
    x.rs=rr.filter(r=>sameRecord(r,x));
    if(!x.u&&x.rs.length)x.u=un(x.rs[0])||'un';
    if(!x.u)x.u='un';
    if(!x.total&&x.rs.length)x.total=Math.max(...x.rs.map(proj));
    x.done=x.rs.reduce((a,r)=>a+real(r),0);
    x.balance=x.total-x.done;
    x.k=key(project.id,x.d,x.s,x.u);
    if(used.has(x.k))return;
    used.add(x.k);
    if(c.ativo!==false||x.total||x.done)out.push(x);
  });
  const grouped=new Map();
  rr.forEach(r=>{
    if(!svc(r))return;
    const k=key(project.id,disc(r),svc(r),un(r));
    if(used.has(k))return;
    if(!grouped.has(k))grouped.set(k,{projectId:project.id,d:disc(r),s:svc(r),u:un(r)||'un',total:0,idx:0,rs:[],k});
    const x=grouped.get(k);x.rs.push(r);x.total=Math.max(x.total,proj(r));
  });
  grouped.forEach(x=>{x.done=x.rs.reduce((a,r)=>a+real(r),0);x.balance=x.total-x.done;if(x.total||x.done)out.push(x)});
  return out.sort((a,b)=>a.d.localeCompare(b.d,'pt-BR')||a.s.localeCompare(b.s,'pt-BR')||a.u.localeCompare(b.u,'pt-BR'));
}

const style=document.createElement('style');
style.textContent=`
#quantityRealSimulatorPanel .panel-body{padding:18px}
.qrs-head p{max-width:720px}.qrs-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.qrs-span-2{grid-column:span 2}.qrs-hidden{display:none!important}
.qrs-status{margin-top:16px}.qrs-service-line{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.qrs-service-line strong{font-size:13px}.qrs-service-line small{display:block;margin-top:4px;color:var(--muted);font-size:9px}
.qrs-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.qrs-status-card{padding:13px 14px;border:1px solid var(--line);border-radius:13px;background:#fbfcfe}.qrs-status-card span{display:block;color:#8490a4;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.qrs-status-card strong{display:block;margin-top:6px;font-size:19px;letter-spacing:-.4px}.qrs-status-card.balance{background:#eff6ff;border-color:#dbeafe}.qrs-status-card.balance strong{color:#1d4ed8}
.qrs-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-top:14px}.qrs-results .sim-result{min-height:94px}.qrs-results .sim-result strong{font-size:18px}
.qrs-details{margin-top:14px;border:1px solid var(--line);border-radius:13px;background:#fbfcfe;overflow:hidden}.qrs-details summary{cursor:pointer;list-style:none;padding:13px 15px;font-size:10px;font-weight:900;color:#4b5870;display:flex;align-items:center;justify-content:space-between}.qrs-details summary::-webkit-details-marker{display:none}.qrs-details summary:after{content:'＋';font-size:15px;color:#64748b}.qrs-details[open] summary:after{content:'−'}.qrs-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0 14px 14px}.qrs-detail-card{padding:12px;border:1px solid #e6ebf2;border-radius:11px;background:#fff}.qrs-detail-card span{display:block;color:#8793a7;font-size:8px;font-weight:900;text-transform:uppercase}.qrs-detail-card strong{display:block;margin-top:6px;font-size:14px}.qrs-note{margin:0 14px 14px;padding:11px 12px;border-radius:10px;background:#eef3ff;color:#3c4d73;font-size:10px;line-height:1.55}
.qrs-chart-panel{margin-top:16px!important}.qrs-chart{height:315px}
@media(max-width:1180px){.qrs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.qrs-span-2{grid-column:span 2}.qrs-results,.qrs-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.qrs-grid,.qrs-status-grid,.qrs-results,.qrs-detail-grid{grid-template-columns:1fr}.qrs-span-2{grid-column:auto}.qrs-service-line{display:block}.qrs-status-card strong{font-size:17px}.qrs-chart{height:270px}}
`;
document.head.appendChild(style);

const anchor=$('simulatorCurveChart')?.closest('.panel');
if(!anchor)return;
const box=document.createElement('div');
box.id='quantityRealSimulatorPanel';box.className='panel';box.style.marginTop='17px';
box.innerHTML=`<div class="panel-head qrs-head"><div><h2>Simulação por Quantitativos e Índices</h2><p>Escolha o serviço e ajuste as premissas principais. A Central calcula saldo, HH, produção e prazo usando somente os dados da obra selecionada.</p></div><button id="qrsRefresh" class="btn btn-light btn-small">↻ Atualizar</button></div><div class="panel-body"><div class="qrs-grid"><div class="field qrs-span-2"><label>Serviço / quantitativo</label><select id="qrsItem" class="select"></select></div><div class="field"><label>Índice HH / unidade</label><input id="qrsIndex" class="input" type="number" min="0" step="0.0001" placeholder="Ex.: 72"></div><div class="field"><label>Produtividade</label><select id="qrsProdMode" class="select"><option value="current">Média atual da obra</option><option value="manual">Informar manualmente</option></select><small id="qrsProdNow" class="muted"></small></div><div class="field qrs-hidden" id="qrsProdField"><label>Produtividade manual (%)</label><input id="qrsProd" class="input" type="number" min="1" max="200" step="0.1" value="100"></div><div class="field"><label>Pessoas</label><input id="qrsPeople" class="input" type="number" min="1" step="1" value="96"></div><div class="field"><label>Jornada / dia</label><input id="qrsHours" class="input" type="number" min="1" max="24" step="0.5" value="9"></div><div class="field"><label>Dias / semana</label><select id="qrsDays" class="select"><option value="5">5 · Seg–Sex</option><option value="6" selected>6 · Seg–Sáb</option><option value="7">7 · Todos</option></select></div><div class="field"><label>Início da projeção</label><input id="qrsStart" class="input" type="date"></div><div class="field"><label>Meta de término <span class="muted">(opcional)</span></label><input id="qrsTarget" class="input" type="date"></div></div><div id="qrsSelected" class="qrs-status"></div><div id="qrsResults" class="qrs-results"></div><details id="qrsDetailsWrap" class="qrs-details"><summary>Detalhes do cálculo</summary><div id="qrsDetails" class="qrs-detail-grid"></div><div id="qrsNote" class="qrs-note"></div></details><div class="panel qrs-chart-panel"><div class="panel-head"><div><h2 id="qrsChartTitle">Curva projetada</h2><p id="qrsChartSub">Previsto, realizado e tendência na unidade do serviço.</p></div></div><div class="panel-body"><div class="qrs-chart"><canvas id="qrsChart"></canvas></div></div></div></div>`;
anchor.insertAdjacentElement('afterend',box);

let list=[],sel=null,activeProjectId=null,lastRawRef=null;
function destroyQrsChart(){if(state.charts.qrs){state.charts.qrs.destroy();delete state.charts.qrs}}
function clearOutputs(message){$('qrsSelected').innerHTML=`<div class="qrs-status-card">${E(message||'Selecione um quantitativo para simular.')}</div>`;$('qrsResults').innerHTML='';$('qrsDetails').innerHTML='';$('qrsNote').textContent=message||'Selecione um quantitativo para simular.';$('qrsProdNow').textContent='';$('qrsChartTitle').textContent='Curva projetada';$('qrsChartSub').textContent='Previsto, realizado e tendência na unidade do serviço.';destroyQrsChart()}
function resetProject(project,message='Carregando quantitativos da obra selecionada…'){activeProjectId=project?.id||null;lastRawRef=null;list=[];sel=null;const q=$('qrsItem');q.disabled=true;q.innerHTML=`<option value="">${E(message)}</option>`;$('qrsIndex').value='';$('qrsStart').value='';clearOutputs(message)}
function projectReady(project){if(!project)return false;if(!hasOwn(state.raw,project.id))return false;return state.status?.[project.id]!=='loading'}
function lastReal(x){return x?.rs?.filter(r=>real(r)>0).map(dt).filter(Boolean).sort((a,b)=>b-a)[0]||null}
function storedIndex(project,x){if(x.idx>0)return x.idx;return N(localStorage.getItem('qrs-idx-'+project.id+'-'+x.k))}
function applySelection(project,index){sel=list[index]||null;if(!sel){clearOutputs('Nenhum quantitativo disponível nesta obra.');return}$('qrsItem').value=String(index);$('qrsIndex').value=storedIndex(project,sel)||'';const lr=lastReal(sel);$('qrsStart').value=dateInputValue(lr?addDays(lr,1):(M(project).currentDate||new Date()));calc()}
function load(force=false){
  const project=P();if(!project){resetProject(null,'Obra do simulador não identificada.');return}
  const changed=activeProjectId!==project.id,oldKey=!changed?sel?.k:null;if(changed)resetProject(project);
  if(!projectReady(project)){const msg=state.status?.[project.id]==='error'&&!hasOwn(state.raw,project.id)?'Não foi possível carregar os quantitativos da obra selecionada.':'Carregando quantitativos da obra selecionada…';if($('qrsItem').options[0]?.textContent!==msg)resetProject(project,msg);return}
  const raw=state.raw[project.id];if(!force&&raw===lastRawRef&&!changed)return;lastRawRef=raw;list=items(project,raw);const q=$('qrsItem');q.disabled=!list.length;q.innerHTML=list.length?list.map((x,i)=>`<option value="${i}">${E(x.d?x.d+' · ':'')}${E(x.s)} · ${E(x.u)}</option>`).join(''):'<option value="">Nenhum quantitativo encontrado nesta obra</option>';
  if(!list.length){sel=null;$('qrsIndex').value='';$('qrsStart').value='';clearOutputs('Nenhum quantitativo encontrado nesta obra.');return}
  let index=oldKey?list.findIndex(x=>x.k===oldKey):-1;if(index<0)index=0;applySelection(project,index)
}
function choose(){const project=P();if(!project||activeProjectId!==project.id)return;applySelection(project,Number($('qrsItem').value))}

function curve(x,c){
  const m=new Map();x.rs.forEach(r=>{const d=dt(r);if(!d)return;const k=dateInputValue(d);if(!m.has(k))m.set(k,{d:new Date(d.getFullYear(),d.getMonth(),d.getDate()),p:0,r:0});const z=m.get(k);z.p+=prev(r);z.r+=real(r)});
  const history=[...m.values()].sort((a,b)=>a.d-b.d);let pc=0,rc=0,last=null;history.forEach(z=>{pc+=z.p;rc+=z.r;z.pc=pc;z.rc=rc;if(z.r>0)last=z.d});const all=new Map(history.map(z=>[dateInputValue(z.d),{d:z.d,p:z.pc,r:z.rc,t:null}]));let st=new Date(c.start);if(last&&st<=last)st=addDays(last,1);
  if(last){const lk=dateInputValue(last),lz=all.get(lk)||{d:new Date(last),p:null,r:x.done,t:null};lz.t=x.done;all.set(lk,lz);const beforeStart=addDays(st,-1);if(beforeStart>last){const bk=dateInputValue(beforeStart),bz=all.get(bk)||{d:beforeStart,p:null,r:null,t:null};bz.t=x.done;all.set(bk,bz)}}else{const anchorDate=addDays(st,-1),ak=dateInputValue(anchorDate),az=all.get(ak)||{d:anchorDate,p:null,r:null,t:null};az.t=x.done;all.set(ak,az)}
  if(c.ok&&c.finish){let d=new Date(st),v=x.done,guard=0;while(d<=c.finish&&guard++<1200){if(isWorkingDay(d,c.days))v=Math.min(x.total,v+c.qday);const k=dateInputValue(d),a=all.get(k)||{d:new Date(d),p:null,r:null,t:null};a.t=v;all.set(k,a);if(v>=x.total)break;d=addDays(d,1)}}
  return{pts:[...all.values()].sort((a,b)=>a.d-b.d),last}
}
function chart(x,c){destroyQrsChart();const cv=$('qrsChart');if(!cv||!x)return;const d=curve(x,c),u=x.u||'un';$('qrsChartTitle').textContent=`Curva — ${x.s}`;$('qrsChartSub').textContent=`Project ${F(x.total)} ${u} · Real ${F(x.done)} ${u} · Saldo ${F(x.balance)} ${u}`;state.charts.qrs=new Chart(cv,{type:'line',data:{labels:d.pts.map(z=>formatDate(z.d,true)),datasets:[{label:'Previsto acumulado',data:d.pts.map(z=>z.p),borderWidth:2,pointRadius:1.5,tension:.2,spanGaps:true},{label:'Real acumulado',data:d.pts.map(z=>d.last&&z.d>d.last?null:z.r),borderWidth:3,pointRadius:2.5,tension:.2,spanGaps:false},{label:'Tendência',data:d.pts.map(z=>z.t),borderWidth:3,borderDash:[7,5],pointRadius:0,tension:.15,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:10}}},tooltip:{callbacks:{label:a=>`${a.dataset.label}: ${F(a.raw)} ${u}`}}},scales:{y:{beginAtZero:true,suggestedMax:Math.max(1,x.total,x.done)*1.05,ticks:{callback:v=>Number(v).toLocaleString('pt-BR')+' '+u}},x:{ticks:{autoSkip:true,maxTicksLimit:12,maxRotation:0},grid:{display:false}}}}})}
function calc(){
  const project=P();if(!project||activeProjectId!==project.id||!sel||sel.projectId!==project.id){clearOutputs('Nenhum quantitativo disponível nesta obra.');return}
  const m=M(project),idx=Math.max(0,N($('qrsIndex').value)),mode=$('qrsProdMode').value,cur=m.hh.productivity>0?m.hh.productivity:1,prod=mode==='current'?cur:Math.max(.01,N($('qrsProd').value)/100);$('qrsProd').disabled=mode==='current';$('qrsProdField')?.classList.toggle('qrs-hidden',mode!=='manual');$('qrsProdNow').textContent='Atual: '+(m.hh.productivity>0?(m.hh.productivity*100).toFixed(1).replace('.',',')+'%':'sem histórico; 100%');
  const people=Math.max(1,N($('qrsPeople').value)||1),hours=Math.max(.1,N($('qrsHours').value)||9),days=Math.max(5,Math.min(7,N($('qrsDays').value)||6)),lr=lastReal(sel);let start=parseDate($('qrsStart').value)||new Date();if(lr&&start<=lr)start=addDays(lr,1);const target=parseDate($('qrsTarget').value),bal=sel.balance,remaining=Math.max(0,bal),base=remaining*idx,realhh=idx?base/prod:0,capacity=people*hours*prod,qday=idx?capacity/idx:0,dneed=qday?remaining/qday:null,finish=dneed===null?null:addWorkingDays(start,Math.ceil(dneed),days),avail=target?countWorkingDays(start,target,days):0,req=target&&avail&&idx?realhh/(avail*hours):null,delta=req===null?null:people-req,ok=idx>0&&qday>0&&remaining>0;
  if(idx&&!sel.idx)localStorage.setItem('qrs-idx-'+project.id+'-'+sel.k,String(idx));
  $('qrsSelected').innerHTML=`<div class="qrs-service-line"><div><strong>${E(sel.s)}</strong><small>${E(sel.d||'Sem disciplina informada')} · ${E(sel.u)}</small></div></div><div class="qrs-status-grid"><div class="qrs-status-card"><span>Project</span><strong>${F(sel.total)} ${E(sel.u)}</strong></div><div class="qrs-status-card"><span>Real</span><strong>${F(sel.done)} ${E(sel.u)}</strong></div><div class="qrs-status-card balance"><span>Saldo</span><strong>${F(bal)} ${E(sel.u)}</strong></div></div>`;
  $('qrsResults').innerHTML=`<div class="sim-result"><span>HH necessárias</span><strong>${idx?F(realhh,0)+' HH':'—'}</strong><small>Para concluir o saldo</small></div><div class="sim-result"><span>Produção / dia</span><strong>${ok?F(qday)+' '+E(sel.u):'—'}</strong><small>${people} pessoas · ${F(hours,1)} h/dia</small></div><div class="sim-result"><span>Dias necessários</span><strong>${dneed===null?'—':F(dneed,1)}</strong><small>${days} dias trabalhados/semana</small></div><div class="sim-result"><span>Término projetado</span><strong>${finish?formatDate(finish):'—'}</strong><small>${idx?'Com as premissas atuais':'Informe o índice'}</small></div>`;
  $('qrsDetails').innerHTML=`<div class="qrs-detail-card"><span>Índice</span><strong>${idx?F(idx,4):'—'} HH/${E(sel.u)}</strong></div><div class="qrs-detail-card"><span>HH base do saldo</span><strong>${idx?F(base,0)+' HH':'—'}</strong></div><div class="qrs-detail-card"><span>Produtividade</span><strong>${(prod*100).toFixed(1).replace('.',',')}%</strong></div><div class="qrs-detail-card"><span>Capacidade produtiva</span><strong>${F(capacity,0)} HH/dia</strong></div><div class="qrs-detail-card"><span>Pessoas para a meta</span><strong>${req===null?'—':F(req,1)}</strong></div><div class="qrs-detail-card"><span>Folga / déficit</span><strong class="${delta!==null&&delta<0?'number-red':'number-green'}">${delta===null?'—':(delta>0?'+':'')+F(delta,1)}</strong></div><div class="qrs-detail-card"><span>Início</span><strong>${formatDate(start)}</strong></div><div class="qrs-detail-card"><span>Meta</span><strong>${target?formatDate(target):'Não informada'}</strong></div>`;
  $('qrsNote').textContent=idx?`Memória: saldo ${F(remaining)} ${sel.u} × índice ${F(idx,4)} = ${F(base,0)} HH base. Ajustado pela produtividade de ${(prod*100).toFixed(1).replace('.',',')}%, são ${F(realhh,0)} HH reais necessárias.`:`Informe o índice HH/${sel.u}. Se houver índice cadastrado na própria obra, ele é preenchido automaticamente.`;
  chart(sel,{start,days,qday,finish,ok})
}

$('qrsItem').addEventListener('change',choose);
['qrsIndex','qrsProd','qrsPeople','qrsHours','qrsStart','qrsTarget'].forEach(id=>$(id).addEventListener('input',calc));
['qrsProdMode','qrsDays'].forEach(id=>$(id).addEventListener('change',calc));
$('qrsRefresh').addEventListener('click',()=>load(true));
$('simProjectSelector')?.addEventListener('change',event=>{const id=event.currentTarget.value;if(PROJECTS.some(p=>p.id===id))state.simulatorProjectId=id;const project=P();resetProject(project);setTimeout(()=>load(true),0)});
$('qrsPeople').value=$('simPeople')?.value||96;$('qrsHours').value=$('simHoursDay')?.value||9;$('qrsDays').value=$('simDaysWeek')?.value||6;$('qrsTarget').value=$('simTargetDate')?.value||'';
setInterval(()=>load(false),750);load(true);
})();
