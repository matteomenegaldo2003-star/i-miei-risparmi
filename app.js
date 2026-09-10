
const KEY="risparmi-app-v2", THEME_KEY="risparmi-theme", COLOR_KEY="risparmi-primary-color", CURRENCY_KEY="risparmi-currency";
let movements=JSON.parse(localStorage.getItem(KEY)||"[]");
let accounts=JSON.parse(localStorage.getItem("risparmi-accounts")||"null")||[{id:1,name:"Conto principale",initial:0}];
let goals=JSON.parse(localStorage.getItem("risparmi-goals")||"[]");
let budgets=JSON.parse(localStorage.getItem("risparmi-budgets")||"[]");
let current=new Date(); current.setDate(1);
let selected=new Date();

let currency=localStorage.getItem(CURRENCY_KEY)||"EUR";
const money=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency}).format(Number(n)||0);
const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
function save(){
  localStorage.setItem(KEY,JSON.stringify(movements));
  localStorage.setItem("risparmi-accounts",JSON.stringify(accounts));
  localStorage.setItem("risparmi-goals",JSON.stringify(goals));
  localStorage.setItem("risparmi-budgets",JSON.stringify(budgets));
  render();
}
function setTheme(choice){
  localStorage.setItem(THEME_KEY,choice);
  document.documentElement.dataset.theme=choice==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):choice;
  document.querySelectorAll(".theme-btn").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===choice));
}
function setPrimaryColor(color,contrast){
  localStorage.setItem(COLOR_KEY,color);
  document.documentElement.style.setProperty("--primary",color);
  document.documentElement.style.setProperty("--primary-contrast",contrast||"#fff");
  document.querySelectorAll(".color-swatch").forEach(b=>b.classList.toggle("active",b.dataset.color.toLowerCase()===color.toLowerCase()));
}
const savedTheme=localStorage.getItem(THEME_KEY)||"dark";
setTheme(savedTheme);
const savedColor=localStorage.getItem(COLOR_KEY)||"#0A84FF";
const savedColorButton=[...document.querySelectorAll(".color-swatch")].find(b=>b.dataset.color.toLowerCase()===savedColor.toLowerCase());
setPrimaryColor(savedColor,savedColorButton?.dataset.contrast||"#fff");
function applyCurrency(value){
  currency=value||"EUR";localStorage.setItem(CURRENCY_KEY,currency);
  const sel=document.getElementById("currencySelect");if(sel)sel.value=currency;
  document.querySelectorAll("[data-currency-label]").forEach(el=>el.textContent=currency);
  render();
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if((localStorage.getItem(THEME_KEY)||"dark")==="system")setTheme("system")});
document.querySelectorAll(".theme-btn").forEach(b=>b.onclick=()=>setTheme(b.dataset.themeChoice));
document.querySelectorAll(".color-swatch").forEach(b=>b.onclick=()=>setPrimaryColor(b.dataset.color,b.dataset.contrast));

function render(){
  const y=current.getFullYear(),m=current.getMonth(), today=iso(new Date());
  document.getElementById("monthTitle").textContent=current.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  const first=(new Date(y,m,1).getDay()+6)%7,last=new Date(y,m+1,0).getDate(),box=document.getElementById("days");
  box.innerHTML="";
  for(let i=0;i<first;i++)box.appendChild(Object.assign(document.createElement("div"),{className:"day empty"}));
  for(let d=1;d<=last;d++){
    const date=new Date(y,m,d),key=iso(date),cell=document.createElement("div");
    cell.className="day"+(iso(selected)===key?" selected":"")+(key===today?" today":"");
    cell.innerHTML=`<div class="num">${d}</div>`;
    movements.filter(x=>x.date===key).forEach(x=>{
      const el=document.createElement("div");el.className="mov "+x.type;
      el.textContent=(x.type==="in"?"+ ":x.type==="out"?"- ":"↔ ")+money(x.amount)+" "+x.description;cell.appendChild(el);
    });
    cell.onclick=()=>{selected=date;render()};box.appendChild(cell);
  }

  const prefix=`${y}-${String(m+1).padStart(2,"0")}`, month=movements.filter(x=>x.date.startsWith(prefix));
  const inc=month.filter(x=>x.type==="in").reduce((a,x)=>a+x.amount,0),out=month.filter(x=>x.type==="out").reduce((a,x)=>a+x.amount,0);
  document.getElementById("monthIncome").textContent=money(inc);document.getElementById("monthExpense").textContent=money(out);document.getElementById("monthSaving").textContent=money(inc-out);
  const total=accounts.reduce((a,x)=>a+accountBalance(x.id),0);document.getElementById("balance").textContent=money(total);

  document.getElementById("detailTitle").textContent="Movimenti del "+selected.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
  const list=document.getElementById("movements");list.innerHTML="";
  const selectedFilter=document.getElementById("movementFilter").value;
  const day=movements.filter(x=>x.date===iso(selected)&&(selectedFilter==="all"||x.type===selectedFilter));
  if(!day.length)list.innerHTML='<p class="empty-text">Nessun movimento registrato.</p>';
  day.forEach(x=>{
    const r=document.createElement("div");r.className="row";
    r.innerHTML=`<div><strong>${escapeHtml(x.description)}</strong><br><small>${escapeHtml(x.category)} · ${escapeHtml(accounts.find(a=>Number(a.id)===Number(x.accountId))?.name||"Conto principale")}</small></div>
      <div style="text-align:right"><strong class="${x.type==="in"?"income":x.type==="out"?"expense":"saving"}">${x.type==="in"?"+":x.type==="out"?"-":"↔"} ${money(x.amount)}</strong>
      <div class="row-actions"><button class="icon-btn" onclick="editMovement(${x.id})">✏️</button><button class="icon-btn" onclick="deleteMovement(${x.id})">🗑️</button></div></div>`;
    list.appendChild(r);
  });
  renderAccounts();renderGoal();renderBudgets();renderSearch();if(document.getElementById("graphsPage").classList.contains("active"))renderStats();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function editMovement(id){
  const x=movements.find(v=>v.id===id);if(!x)return;
  movementEditId.value=x.id;movementType.value=x.type;movementAmount.value=x.amount;movementDescription.value=x.description;movementCategory.value=x.category;movementDate.value=x.date;populateAccountSelect();movementAccount.value=String(x.accountId||accounts[0].id);
  movementDialogTitle.textContent="Modifica movimento";
  document.querySelectorAll(".quick-type").forEach(b=>b.classList.toggle("active",b.dataset.quickType===x.type));
  document.getElementById("destinationWrap").style.display=x.type==="transfer"?"block":"none";
  movementCategory.disabled=x.type==="transfer";movementRecurrence.disabled=true;
  renderCategoryShortcuts();dialog.showModal();
}
function deleteMovement(id){
  if(confirm("Vuoi eliminare questo movimento?")){movements=movements.filter(x=>x.id!==id);save();}
}
document.getElementById("prev").onclick=()=>{current.setMonth(current.getMonth()-1);render()};
document.getElementById("next").onclick=()=>{current.setMonth(current.getMonth()+1);render()};
const dialog=document.getElementById("dialog");
const movementForm=document.getElementById("form");
const movementType=document.getElementById("type");
const movementAmount=document.getElementById("amount");
const movementDescription=document.getElementById("description");
const movementAccount=document.getElementById("account");
const movementDestination=document.getElementById("destinationAccount");
const movementCategory=document.getElementById("category");
const movementDate=document.getElementById("date");
const movementRecurrence=document.getElementById("recurrence");
const movementEditId=document.getElementById("editId");
const movementDialogTitle=document.getElementById("dialogTitle");

const quickCategories=["Alimentari","Casa","Trasporti","Svago","Shopping","Bollette","Altro"];
function renderCategoryShortcuts(){
  const el=document.getElementById("categoryShortcuts"); if(!el)return;
  el.innerHTML=quickCategories.map(c=>`<button type="button" class="secondary category-chip" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  el.querySelectorAll(".category-chip").forEach(b=>b.onclick=()=>{movementCategory.value=b.dataset.category});
}
document.querySelectorAll(".quick-type").forEach(b=>b.onclick=()=>{
  movementType.value=b.dataset.quickType;
  document.querySelectorAll(".quick-type").forEach(x=>x.classList.toggle("active",x===b));
  document.getElementById("destinationWrap").style.display=movementType.value==="transfer"?"block":"none";
  movementCategory.disabled=movementType.value==="transfer";movementRecurrence.disabled=movementType.value==="transfer";
});
function openMovement(){
  if(dialog.open) dialog.close();
  movementForm.reset();
  populateAccountSelect();
  populateDestinationSelect();
  renderCategoryShortcuts();
  movementType.value="out";
  document.querySelectorAll(".quick-type").forEach(x=>x.classList.toggle("active",x.dataset.quickType==="out"));
  document.getElementById("destinationWrap").style.display="none";
  movementCategory.disabled=false;
  movementRecurrence.disabled=false;
  movementEditId.value="";
  movementDialogTitle.textContent="Nuovo movimento";
  movementDate.value=iso(selected);
  try{ dialog.showModal(); }catch(e){ dialog.setAttribute("open",""); }
  setTimeout(()=>movementAmount.focus(),80);
}
document.getElementById("fab").addEventListener("click",openMovement);
document.getElementById("addBtn").addEventListener("click",openMovement);
document.getElementById("cancel").onclick=()=>dialog.close();
movementForm.onsubmit=e=>{
  e.preventDefault();
  const data={
    type:movementType.value,
    amount:Number(movementAmount.value),
    description:movementDescription.value.trim(),
    category:movementCategory.value,
    date:movementDate.value,
    accountId:Number(movementAccount.value),
    recurrence:movementRecurrence.value
  };
  if(!data.amount || data.amount<=0 || !data.date){return}
  if(data.type==="transfer"){
    const from=Number(movementAccount.value),to=Number(movementDestination.value);
    if(from===to){alert("Scegli due conti diversi.");return}
    movements.push({
      id:Date.now(),type:"transfer",amount:data.amount,
      description:data.description||"Trasferimento",category:"Trasferimento",
      date:data.date,accountId:from,destinationAccountId:to
    });
  } else if(movementEditId.value){
    const i=movements.findIndex(x=>x.id===Number(movementEditId.value));
    if(i>=0)movements[i]={...movements[i],...data};
  } else {
    movements.push({id:Date.now(),...data});
    if(data.recurrence==="monthly"){
      const base=new Date(data.date+"T00:00:00");
      for(let i=1;i<=11;i++){
        const d=new Date(base);d.setMonth(d.getMonth()+i);
        movements.push({...data,id:Date.now()+i,date:iso(d),recurrence:"generated"});
      }
    }
  }
  save();dialog.close();movementForm.reset();
};

document.getElementById("goalForm").onsubmit=e=>{
  e.preventDefault();goals.push({id:Date.now(),name:goalName.value.trim(),amount:Number(goalAmount.value)});save();goalDialog.close();e.target.reset();
};

function populateAccountSelect(){
  const selects=[document.getElementById("account"),document.getElementById("searchAccount")];
  selects.forEach((s,si)=>{
    if(!s)return;
    const current=s.value;
    s.innerHTML=(si?'<option value="all">Tutti i conti</option>':'')+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
    if([...s.options].some(o=>o.value===current))s.value=current;
  });
}
function accountBalance(id){
  const a=accounts.find(x=>x.id===Number(id)); if(!a)return 0;
  return Number(a.initial||0)+movements.reduce((sum,x)=>{
    if(x.type==="transfer"){
      if(Number(x.accountId)===Number(id)) return sum-x.amount;
      if(Number(x.destinationAccountId)===Number(id)) return sum+x.amount;
      return sum;
    }
    if(Number(x.accountId)!==Number(id))return sum;
    return sum+(x.type==="in"?x.amount:-x.amount);
  },0);
}
function renderAccounts(){
  populateAccountSelect();populateDestinationSelect();
  const list=document.getElementById("accountsList");
  list.innerHTML=accounts.map(a=>`<div class="account-row"><div><div class="account-name">${escapeHtml(a.name)}</div><small class="transfer-note">Saldo iniziale ${money(Number(a.initial||0))}</small></div><div class="account-actions"><strong class="account-balance">${money(accountBalance(a.id))}</strong><button class="mini-btn" onclick="deleteAccount(${a.id})">🗑️</button></div></div>`).join("");
}
function deleteAccount(id){
  if(accounts.length<=1){alert("Devi mantenere almeno un conto.");return}
  if(movements.some(x=>Number(x.accountId)===Number(id))){alert("Questo conto contiene movimenti. Per ora non può essere eliminato.");return}
  accounts=accounts.filter(a=>a.id!==Number(id));save();
}
function renderGoal(){
  const el=document.getElementById("goalView");
  if(!goals.length){el.innerHTML='<p class="empty-text">Nessun obiettivo. Creane uno per seguire un traguardo di risparmio.</p>';return}
  const totalBalance=movements.reduce((a,x)=>a+(x.type==="in"?x.amount:x.type==="out"?-x.amount:0),0);
  el.innerHTML=goals.map(g=>{
    const pct=Math.max(0,Math.min(100,totalBalance/Number(g.amount)*100));
    return `<div class="goal-item"><div class="goal-top"><strong>${escapeHtml(g.name)}</strong><button class="mini-btn goal-delete" onclick="deleteGoal(${g.id})">🗑️</button></div>
    <div class="progress"><div style="width:${pct}%"></div></div><div class="goal-meta"><span>${money(Math.max(0,totalBalance))}</span><span>${money(g.amount)} · ${pct.toFixed(0)}%</span></div></div>`;
  }).join("");
}
function deleteGoal(id){goals=goals.filter(g=>g.id!==Number(id));save();}
function renderBudgets(){
  const list=document.getElementById("budgetsList");
  const month=new Date().toISOString().slice(0,7);
  if(!budgets.length){list.innerHTML='<p class="empty-text">Nessun budget impostato.</p>';return}
  list.innerHTML=budgets.map(b=>{
    const spent=movements.filter(x=>x.type==="out"&&x.category===b.category&&x.date.startsWith(month)).reduce((a,x)=>a+x.amount,0);
    const pct=Math.min(100,spent/b.amount*100), over=spent>b.amount;
    return `<div class="budget-row"><div class="budget-top"><strong>${escapeHtml(b.category)}</strong><span class="${over?'budget-over':''}">${money(spent)} / ${money(b.amount)}</span></div><div class="budget-progress"><div style="width:${pct}%"></div></div><small class="${over?'budget-over':''}">${over?'Budget superato di '+money(spent-b.amount):'Restano '+money(b.amount-spent)}</small><button class="mini-btn" style="float:right" onclick="deleteBudget(${b.id})">🗑️</button></div>`;
  }).join("");
}
function deleteBudget(id){budgets=budgets.filter(b=>b.id!==Number(id));save();}
function renderSearch(){
  const qEl=document.getElementById("searchText"),tEl=document.getElementById("searchType"),aEl=document.getElementById("searchAccount"),el=document.getElementById("searchResults");
  if(!qEl||!tEl||!aEl||!el)return;
  const q=qEl.value.trim().toLowerCase(),t=tEl.value,a=aEl.value;
  const result=movements.filter(x=>(!q||x.description.toLowerCase().includes(q)||x.category.toLowerCase().includes(q))&&(t==="all"||x.type===t)&&(a==="all"||Number(x.accountId)===Number(a))).sort((a,b)=>b.date.localeCompare(a.date));
  if(!result.length){el.innerHTML='<p class="empty-text">Nessun movimento trovato.</p>';return}
  el.innerHTML=result.slice(0,100).map(x=>`<div class="search-result"><div><strong>${escapeHtml(x.description)}</strong><br><small>${x.date} · ${escapeHtml(x.category)} · ${escapeHtml(accounts.find(a=>Number(a.id)===Number(x.accountId))?.name||"Conto principale")}</small></div><strong class="${x.type==="in"?"income":x.type==="out"?"expense":"saving"}">${x.type==="in"?"+":x.type==="out"?"-":"↔"} ${money(x.amount)}</strong></div>`).join("");
}
function clearGoal(){goal=null;renderGoal()}
function getPeriodData(){
  const start=document.getElementById("periodStart").value;
  const end=document.getElementById("periodEnd").value;
  if(!start||!end||start>end)return [];
  const startD=new Date(start+"T00:00:00"), endD=new Date(end+"T23:59:59");
  const months=[];
  let d=new Date(startD.getFullYear(),startD.getMonth(),1);
  const final=new Date(endD.getFullYear(),endD.getMonth(),1);
  while(d<=final){
    const y=d.getFullYear(),m=d.getMonth(),prefix=`${y}-${String(m+1).padStart(2,"0")}`;
    const mm=movements.filter(x=>x.date.startsWith(prefix)&&x.date>=start&&x.date<=end);
    const income=mm.filter(x=>x.type==="in").reduce((a,x)=>a+x.amount,0);
    const expense=mm.filter(x=>x.type==="out").reduce((a,x)=>a+x.amount,0);
    months.push({label:d.toLocaleDateString("it-IT",{month:"short",year:"2-digit"}).replace(".",""),income,expense,saving:income-expense});
    d.setMonth(d.getMonth()+1);
  }
  return months;
}
function renderStats(){
  const data=getPeriodData();
  const income=data.reduce((a,x)=>a+x.income,0),expense=data.reduce((a,x)=>a+x.expense,0);
  document.getElementById("periodIncome").textContent=money(income);
  document.getElementById("periodExpense").textContent=money(expense);
  document.getElementById("periodSaving").textContent=money(income-expense);
  drawGroupedChart(data);drawSavingsChart(data);
}
function setupDefaultPeriod(){
  const now=new Date(),start=new Date(now.getFullYear(),0,1),end=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const startEl=document.getElementById("periodStart");
  const endEl=document.getElementById("periodEnd");
  if(startEl) startEl.value=iso(start);
  if(endEl) endEl.value=iso(end);
}
function setPreset(kind){
  const now=new Date(),end=iso(now);let start;
  if(kind==="month")start=iso(new Date(now.getFullYear(),now.getMonth(),1));
  else if(kind==="quarter")start=iso(new Date(now.getFullYear(),now.getMonth()-2,1));
  else if(kind==="year")start=iso(new Date(now.getFullYear(),0,1));
  else {start=movements.length?movements.reduce((min,x)=>x.date<min?x.date:min,iso(now)):iso(new Date(now.getFullYear(),0,1))}
  const startEl=document.getElementById("periodStart");
  const endEl=document.getElementById("periodEnd");
  if(startEl) startEl.value=start;
  if(endEl) endEl.value=end;
  renderStats();
}
function drawGroupedChart(data){
  drawBarChart(document.getElementById("incomeExpenseChart"),data.map(x=>({label:x.label,a:x.income,b:x.expense})),true);
}
function drawSavingsChart(data){
  drawBarChart(document.getElementById("savingsChart"),data.map(x=>({label:x.label,a:x.saving,b:null})),false);
}
function drawBarChart(canvas,data,grouped){
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  const css=getComputedStyle(document.documentElement),text=css.getPropertyValue("--text").trim(),muted=css.getPropertyValue("--muted").trim(),border=css.getPropertyValue("--border").trim(),primary=css.getPropertyValue("--primary").trim();
  if(!data.length){ctx.fillStyle=muted;ctx.font="14px system-ui";ctx.fillText("Seleziona un periodo valido.",25,120);return}
  const vals=data.flatMap(x=>grouped?[x.a,x.b]:[x.a]),max=Math.max(1,...vals.map(v=>Math.abs(v))),pad={l:70,r:20,t:25,b:48},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,zero=pad.t+ch/2,scale=ch/(2*max);
  ctx.strokeStyle=border;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,zero);ctx.lineTo(w-pad.r,zero);ctx.stroke();
  const slot=cw/data.length, gap=6, bw=grouped?Math.max(4,(slot-gap*3)/2):Math.max(6,slot-gap*2);
  ctx.textAlign="center";ctx.font="11px system-ui";
  data.forEach((x,i)=>{
    const base=pad.l+i*slot+slot/2;
    const draw=(value,dx)=>{
      if(value===null)return;
      const bh=Math.abs(value)*scale,y=value>=0?zero-bh:zero;
      ctx.fillStyle=primary;ctx.fillRect(base+dx-bw/2,y,bw,Math.max(1,bh));
      ctx.fillStyle=text;ctx.font="10px system-ui";
      ctx.fillText(money(value),base+dx,value>=0?Math.max(12,y-5):Math.min(h-30,y+bh+14));
    };
    if(grouped){draw(x.a,-(bw+gap/2)/2);draw(x.b,(bw+gap/2)/2)}
    else draw(x.a,0);
    ctx.fillStyle=muted;ctx.font="11px system-ui";ctx.fillText(x.label,base,h-15);
  });
  ctx.fillStyle=muted;ctx.textAlign="right";ctx.font="10px system-ui";
  ctx.fillText(money(max),pad.l-8,pad.t+5);ctx.fillText("€ 0",pad.l-8,zero+4);ctx.fillText("-"+money(max),pad.l-8,h-pad.b+5);
  ctx.textAlign="left";
}


function activatePage(pageId){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.page===pageId));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active", p.id===pageId));
  if(pageId==="graphsPage")renderStats();
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>activatePage(btn.dataset.page)));
document.getElementById("applyPeriod").onclick=renderStats;
document.querySelectorAll(".preset").forEach(btn=>btn.onclick=()=>setPreset(btn.dataset.period));
setupDefaultPeriod();
activatePage("calendarPage");


const exportDataEl=document.getElementById("exportData");
if(exportDataEl) exportDataEl.onclick=()=>{
  const payload={version:3,exportedAt:new Date().toISOString(),movements,accounts,goals,budgets,theme:localStorage.getItem(THEME_KEY)||"dark",color:localStorage.getItem(COLOR_KEY)||"#0A84FF",currency:currency};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="i-miei-risparmi-backup.json";a.click();URL.revokeObjectURL(a.href);
};
const importDataEl=document.getElementById("importData");
if(importDataEl) importDataEl.onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const p=JSON.parse(reader.result);
      if(!Array.isArray(p.movements)||!Array.isArray(p.accounts)){throw new Error()}
      movements=p.movements;accounts=p.accounts;goals=Array.isArray(p.goals)?p.goals:[];budgets=Array.isArray(p.budgets)?p.budgets:[];
      if(p.theme)setTheme(p.theme);if(p.color){const b=[...document.querySelectorAll(".color-swatch")].find(x=>x.dataset.color.toLowerCase()===String(p.color).toLowerCase());setPrimaryColor(p.color,b?.dataset.contrast||"#fff");}if(p.currency)applyCurrency(p.currency);save();alert("Dati importati correttamente.");
    }catch{alert("File non valido.");}
  };reader.readAsText(file);e.target.value="";
};


document.getElementById("addAccountBtn").onclick=()=>{accountForm.reset();accountInitial.value="0";accountDialog.showModal()};
document.getElementById("accountForm").onsubmit=e=>{e.preventDefault();accounts.push({id:Date.now(),name:accountName.value.trim(),initial:Number(accountInitial.value)});save();accountDialog.close();};
document.getElementById("addGoalBtn").onclick=()=>{goalForm.reset();goalDialog.showModal()};
document.getElementById("goalForm").onsubmit=e=>{e.preventDefault();goals.push({id:Date.now(),name:goalName.value.trim(),amount:Number(goalAmount.value)});save();goalDialog.close();};
document.getElementById("addBudgetBtn").onclick=()=>{budgetForm.reset();budgetDialog.showModal()};
document.getElementById("budgetForm").onsubmit=e=>{e.preventDefault();budgets=budgets.filter(b=>b.category!==budgetCategory.value);budgets.push({id:Date.now(),category:budgetCategory.value,amount:Number(budgetAmount.value)});save();budgetDialog.close();};
["searchText","searchType","searchAccount"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener(id==="searchText"?"input":"change",renderSearch);});
if(document.getElementById("clearSearch"))document.getElementById("clearSearch").onclick=()=>{const q=document.getElementById("searchText"),t=document.getElementById("searchType"),a=document.getElementById("searchAccount");if(q)q.value="";if(t)t.value="all";if(a)a.value="all";renderSearch()};
document.getElementById("movementFilter").onchange=render;

document.getElementById("currencySelect").onchange=e=>applyCurrency(e.target.value);

populateAccountSelect();populateDestinationSelect();renderCategoryShortcuts();
applyCurrency(currency);
function initializeCalendarView(){
  try{ activatePage("calendarPage"); render(); }
  catch(error){ console.error("Errore inizializzazione calendario:",error); }
}
initializeCalendarView();
window.addEventListener("pageshow",initializeCalendarView);
