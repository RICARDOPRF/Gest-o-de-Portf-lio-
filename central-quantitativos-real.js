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
    const x={
      projectId:project.id,
      id:c.id||'',
      d:c.disciplina??c.Disciplina??'',
      s:c.servico??c.Servico??c['Serviço']??'',
      u:c.un??c.Un??c.unidade??c.Unidade??'',
      total:N(c.quantidade??c.Project??c.Projeto??c.total),
      idx:N(c.indiceHH??c.indice??c.IndiceHH),
      rs:[]
    };
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
    const x=grouped.get(k);
    x.rs.push(r);
    x.total=Math.max(x.total,proj(r));
  });
  grouped.forEach(x=>{
    x.done=x.rs.reduce((a,r)=>a+real(r),0);
    x.balance=x.total-x.done;
    if(x.total||x.done)out.push(x);
  });
  return out.sort((a,b)=>a.d.localeCompare(b.d,'pt-BR')||a.s.localeCompare(b.s,'pt-BR')||a.u.localeCompare(b.u,'pt-BR'));
}

const style=document.createElement('style');
style.textContent='.qrs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.qrs-wide{grid-column:span 2}.qrs-card{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:13px;background:#fbfcfe}.qrs-pills{display:flex;gap:8px;flex-wrap:wrap}.qrs-pill{padding:7px 10px;border:1px solid #dbe4f2;border-radius:999px;background:#fff;font-size:10px;font-weight:800}.qrs-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-top:14px}.qrs-chart{height:330px}.qrs-note{margin-top:14px;padding:15px;border-radius:13px;background:linear-gradient(135deg,#172554,#1e3a8a);color:#fff;font-size:11px;line-height:1.6}@media(max-width:1180px){.qrs-grid,.qrs-results{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.qrs-grid,.qrs-results{grid-template-columns:1fr}.qrs-wide{grid-column:auto}.qrs-chart{height:280px}}';
document.head.appendChild(style);

const anchor=$('simulatorCurveChart')?.closest('.panel');
if(!anchor)return;
const box=document.createElement('div');
box.id='quantityRealSimulatorPanel';
box.className='panel';
box.style.marginTop='17px';
box.innerHTML=`<div class="panel-head"><div><h2>Simulação por quantitativo real do Painel de Bordo</h2><p>Selecione o saldo real de um serviço, informe índice e equipe e gere prazo, efetivo e curva na própria unidade.</p></div><button id="qrsRefresh" class="btn btn-light btn-small">↻ Atualizar quantitativos</button></div><div class="panel-body"><div class="qrs-grid"><div class="field qrs-wide"><label>Quantitativo do painel</label><select id="qrsItem" class="select"></select></div><div class="field"><label>Índice HH / unidade</label><input id="qrsIndex" class="input" type="number" min="0" step="0.0001" placeholder="Ex.: 72"></div><div class="field"><label>Produtividade</label><select id="qrsProdMode" class="select"><option value="current">Média atual da obra</option><option value="manual">Definida por mim</option></select><small id="qrsProdNow" class="muted"></small></div><div class="field"><label>Produtividade manual (%)</label><input id="qrsProd" class="input" type="number" min="1" max="200" step="0.1" value="100"></div><div class="field"><label>Pessoas disponíveis</label><input id="qrsPeople" class="input" type="number" min="1" step="1" value="96"></div><div class="field"><label>Jornada / pessoa / dia</label><input id="qrsHours" class="input" type="number" min="1" max="24" step="0.5" value="9"></div><div class="field"><label>Dias trabalhados / semana</label><select id="qrsDays" class="select"><option value="5">5 · Seg–Sex</option><option value="6" selected>6 · Seg–Sáb</option><option value="7">7 · Todos os dias</option></select></div><div class="field"><label>Início da projeção</label><input id="qrsStart" class="input" type="date"></div><div class="field"><label>Data-alvo (opcional)</label><input id="qrsTarget" class="input" type="date"></div></div><div id="qrsSelected" class="qrs-card"></div><div id="qrsResults" class="qrs-results"></div><div id="qrsNote" class="qrs-note"></div><div class="panel" style="margin-top:17px"><div class="panel-head"><div><h2 id="qrsChartTitle">Curva do quantitativo selecionado</h2><p id="qrsChartSub">Previsto, realizado e tendência da simulação.</p></div></div><div class="panel-body"><div class="qrs-chart"><canvas id="qrsChart"></canvas></div></div></div></div>`;
anchor.insertAdjacentElement('afterend',box);

let list=[];
let sel=null;
let activeProjectId=null;
let lastRawRef=null;

function destroyQrsChart(){
  if(state.charts.qrs){state.charts.qrs.destroy();delete state.charts.qrs;}
}
function clearOutputs(message){
  $('qrsSelected').innerHTML=message||'Selecione um quantitativo para simular.';
  $('qrsResults').innerHTML='';
  $('qrsNote').textContent=message||'Selecione um quantitativo para simular.';
  $('qrsProdNow').textContent='';
  $('qrsChartTitle').textContent='Curva do quantitativo selecionado';
  $('qrsChartSub').textContent='Previsto, realizado e tendência da simulação.';
  destroyQrsChart();
}
function resetProject(project,message='Carregando quantitativos da obra selecionada…'){
  activeProjectId=project?.id||null;
  lastRawRef=null;
  list=[];
  sel=null;
  const q=$('qrsItem');
  q.disabled=true;
  q.innerHTML=`<option value="">${E(message)}</option>`;
  $('qrsIndex').value='';
  $('qrsStart').value='';
  clearOutputs(message);
}
function projectReady(project){
  if(!project)return false;
  if(!hasOwn(state.raw,project.id))return false;
  return state.status?.[project.id]!=='loading';
}
function lastReal(x){return x?.rs?.filter(r=>real(r)>0).map(dt).filter(Boolean).sort((a,b)=>b-a)[0]||null}
function storedIndex(project,x){
  if(x.idx>0)return x.idx;
  return N(localStorage.getItem('qrs-idx-'+project.id+'-'+x.k));
}
function applySelection(project,index){
  sel=list[index]||null;
  if(!sel){clearOutputs('Nenhum quantitativo disponível nesta obra.');return;}
  $('qrsItem').value=String(index);
  $('qrsIndex').value=storedIndex(project,sel)||'';
  const lr=lastReal(sel);
  $('qrsStart').value=dateInputValue(lr?addDays(lr,1):(M(project).currentDate||new Date()));
  calc();
}
function load(force=false){
  const project=P();
  if(!project){resetProject(null,'Obra do simulador não identificada.');return;}

  const changed=activeProjectId!==project.id;
  const oldKey=!changed?sel?.k:null;
  if(changed)resetProject(project);

  if(!projectReady(project)){
    const msg=state.status?.[project.id]==='error'&&!hasOwn(state.raw,project.id)
      ?'Não foi possível carregar os quantitativos da obra selecionada.'
      :'Carregando quantitativos da obra selecionada…';
    if($('qrsItem').options[0]?.textContent!==msg)resetProject(project,msg);
    return;
  }

  const raw=state.raw[project.id];
  if(!force&&raw===lastRawRef&&!changed)return;
  lastRawRef=raw;
  list=items(project,raw);

  const q=$('qrsItem');
  q.disabled=!list.length;
  q.innerHTML=list.length
    ?list.map((x,i)=>`<option value="${i}">${E(x.d?x.d+' · ':'')}${E(x.s)} · ${E(x.u)} — saldo ${F(x.balance)} ${E(x.u)}</option>`).join('')
    :'<option value="">Nenhum quantitativo encontrado nesta obra</option>';

  if(!list.length){
    sel=null;
    $('qrsIndex').value='';
    $('qrsStart').value='';
    clearOutputs('Nenhum quantitativo encontrado em quantitativosGerais/cadastroQuantitativos desta obra.');
    return;
  }

  let index=oldKey?list.findIndex(x=>x.k===oldKey):-1;
  if(index<0)index=0;
  applySelection(project,index);
}
function choose(){
  const project=P();
  if(!project||activeProjectId!==project.id)return;
  applySelection(project,Number($('qrsItem').value));
}

function curve(x,c){
  const m=new Map();
  x.rs.forEach(r=>{
    const d=dt(r);if(!d)return;
    const k=dateInputValue(d);
    if(!m.has(k))m.set(k,{d:new Date(d.getFullYear(),d.getMonth(),d.getDate()),p:0,r:0});
    const z=m.get(k);z.p+=prev(r);z.r+=real(r);
  });
  const history=[...m.values()].sort((a,b)=>a.d-b.d);
  let pc=0,rc=0,last=null;
  history.forEach(z=>{pc+=z.p;rc+=z.r;z.pc=pc;z.rc=rc;if(z.r>0)last=z.d;});
  const all=new Map(history.map(z=>[dateInputValue(z.d),{d:z.d,p:z.pc,r:z.rc,t:null}]));

  let st=new Date(c.start);
  if(last&&st<=last)st=addDays(last,1);

  if(last){
    const lk=dateInputValue(last),lz=all.get(lk)||{d:new Date(last),p:null,r:x.done,t:null};
    lz.t=x.done;all.set(lk,lz);
    const beforeStart=addDays(st,-1);
    if(beforeStart>last){
      const bk=dateInputValue(beforeStart),bz=all.get(bk)||{d:beforeStart,p:null,r:null,t:null};
      bz.t=x.done;all.set(bk,bz);
    }
  }else{
    const anchorDate=addDays(st,-1),ak=dateInputValue(anchorDate),az=all.get(ak)||{d:anchorDate,p:null,r:null,t:null};
    az.t=x.done;all.set(ak,az);
  }

  if(c.ok&&c.finish){
    let d=new Date(st),v=x.done,guard=0;
    while(d<=c.finish&&guard++<1200){
      if(isWorkingDay(d,c.days))v=Math.min(x.total,v+c.qday);
      const k=dateInputValue(d),a=all.get(k)||{d:new Date(d),p:null,r:null,t:null};
      a.t=v;all.set(k,a);
      if(v>=x.total)break;
      d=addDays(d,1);
    }
  }
  return{pts:[...all.values()].sort((a,b)=>a.d-b.d),last};
}
function chart(x,c){
  destroyQrsChart();
  const cv=$('qrsChart');
  if(!cv||!x)return;
  const d=curve(x,c),u=x.u||'un';
  $('qrsChartTitle').textContent=`Curva — ${x.s} (${u})`;
  $('qrsChartSub').textContent=`Project ${F(x.total)} ${u} · Real ${F(x.done)} ${u} · Saldo ${F(x.balance)} ${u}`;
  state.charts.qrs=new Chart(cv,{type:'line',data:{labels:d.pts.map(z=>formatDate(z.d,true)),datasets:[{label:'Previsto acumulado',data:d.pts.map(z=>z.p),borderWidth:2,pointRadius:1.5,tension:.2,spanGaps:true},{label:'Real acumulado',data:d.pts.map(z=>d.last&&z.d>d.last?null:z.r),borderWidth:3,pointRadius:2.5,tension:.2,spanGaps:false},{label:'Tendência da simulação',data:d.pts.map(z=>z.t),borderWidth:3,borderDash:[7,5],pointRadius:0,tension:.15,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:a=>`${a.dataset.label}: ${F(a.raw)} ${u}`}}},scales:{y:{beginAtZero:true,suggestedMax:Math.max(1,x.total,x.done)*1.05,ticks:{callback:v=>Number(v).toLocaleString('pt-BR')+' '+u}},x:{ticks:{autoSkip:true,maxTicksLimit:14,maxRotation:0},grid:{display:false}}}}});
}
function calc(){
  const project=P();
  if(!project||activeProjectId!==project.id||!sel||sel.projectId!==project.id){
    clearOutputs('Nenhum quantitativo disponível nesta obra.');
    return;
  }
  const m=M(project),idx=Math.max(0,N($('qrsIndex').value)),mode=$('qrsProdMode').value;
  const cur=m.hh.productivity>0?m.hh.productivity:1;
  const prod=mode==='current'?cur:Math.max(.01,N($('qrsProd').value)/100);
  $('qrsProd').disabled=mode==='current';
  $('qrsProdNow').textContent='Atual: '+(m.hh.productivity>0?(m.hh.productivity*100).toFixed(1).replace('.',',')+'%':'sem histórico; 100%');

  const people=Math.max(1,N($('qrsPeople').value)||1);
  const hours=Math.max(.1,N($('qrsHours').value)||9);
  const days=Math.max(5,Math.min(7,N($('qrsDays').value)||6));
  const lr=lastReal(sel);
  let start=parseDate($('qrsStart').value)||new Date();
  if(lr&&start<=lr)start=addDays(lr,1);
  const target=parseDate($('qrsTarget').value);
  const bal=sel.balance;
  const remaining=Math.max(0,bal);
  const base=remaining*idx;
  const realhh=idx?base/prod:0;
  const capacity=people*hours*prod;
  const qday=idx?capacity/idx:0;
  const dneed=qday?remaining/qday:null;
  const finish=dneed===null?null:addWorkingDays(start,Math.ceil(dneed),days);
  const avail=target?countWorkingDays(start,target,days):0;
  const req=target&&avail&&idx?realhh/(avail*hours):null;
  const delta=req===null?null:people-req;
  const ok=idx>0&&qday>0&&remaining>0;

  if(idx&&!sel.idx)localStorage.setItem('qrs-idx-'+project.id+'-'+sel.k,String(idx));

  $('qrsSelected').innerHTML=`<div><strong>${E(sel.d?sel.d+' · ':'')}${E(sel.s)}</strong><div class="qrs-pills" style="margin-top:9px"><span class="qrs-pill">PROJECT ${F(sel.total)} ${E(sel.u)}</span><span class="qrs-pill">REAL ${F(sel.done)} ${E(sel.u)}</span><span class="qrs-pill">SALDO ${F(bal)} ${E(sel.u)}</span><span class="qrs-pill">UNIDADE ${E(sel.u)}</span></div></div>`;
  $('qrsResults').innerHTML=`<div class="sim-result"><span>Índice</span><strong>${idx?F(idx,4):'—'} HH/${E(sel.u)}</strong><small>${sel.idx?'Cadastro da própria obra':'Informado no simulador'}</small></div><div class="sim-result"><span>HH base do saldo</span><strong>${idx?F(base,0)+' HH':'—'}</strong><small>Saldo × índice</small></div><div class="sim-result"><span>HH reais necessárias</span><strong>${idx?F(realhh,0)+' HH':'—'}</strong><small>HH base ÷ produtividade</small></div><div class="sim-result"><span>Produtividade</span><strong>${(prod*100).toFixed(1).replace('.',',')}%</strong><small>${mode==='current'?'Média atual da obra':'Manual'}</small></div><div class="sim-result"><span>Produção / dia</span><strong>${ok?F(qday)+' '+E(sel.u):'—'}</strong><small>${F(capacity,0)} HH produtivas/dia</small></div><div class="sim-result"><span>Dias produtivos</span><strong>${dneed===null?'—':F(dneed,1)}</strong><small>${days} dias/semana</small></div><div class="sim-result"><span>Término projetado</span><strong>${finish?formatDate(finish):'—'}</strong><small>Início ${formatDate(start)}</small></div><div class="sim-result"><span>Pessoas p/ data-alvo</span><strong>${req===null?'—':F(req,1)}</strong><small>${avail||0} dias disponíveis</small></div><div class="sim-result"><span>Folga / déficit</span><strong class="${delta!==null&&delta<0?'number-red':'number-green'}">${delta===null?'—':(delta>0?'+':'')+F(delta,1)}</strong><small>${delta===null?'Informe data-alvo':delta>=0?'Folga de pessoas':'Pessoas faltantes'}</small></div>`;
  $('qrsNote').textContent=idx
    ?`Saldo de ${F(bal)} ${sel.u} na obra ${project.short}. HH base ${F(base,0)}; HH reais necessárias ${F(realhh,0)}. Com produtividade ${(prod*100).toFixed(1).replace('.',',')}% e ${people} pessoas, a produção estimada é ${F(qday)} ${sel.u}/dia e o término projetado é ${finish?formatDate(finish):'—'}.`
    :`Quantitativo carregado exclusivamente de ${project.short}. Informe o índice HH/${sel.u} para calcular HH, prazo, equipe e curva.`;
  chart(sel,{start,days,qday,finish,ok});
}

$('qrsItem').addEventListener('change',choose);
['qrsIndex','qrsProd','qrsPeople','qrsHours','qrsStart','qrsTarget'].forEach(id=>$(id).addEventListener('input',calc));
['qrsProdMode','qrsDays'].forEach(id=>$(id).addEventListener('change',calc));
$('qrsRefresh').addEventListener('click',()=>load(true));
$('simProjectSelector')?.addEventListener('change',event=>{
  const id=event.currentTarget.value;
  if(PROJECTS.some(p=>p.id===id))state.simulatorProjectId=id;
  const project=P();
  resetProject(project);
  setTimeout(()=>load(true),0);
});

$('qrsPeople').value=$('simPeople')?.value||96;
$('qrsHours').value=$('simHoursDay')?.value||9;
$('qrsDays').value=$('simDaysWeek')?.value||6;
$('qrsTarget').value=$('simTargetDate')?.value||'';

setInterval(()=>load(false),750);
load(true);
})();