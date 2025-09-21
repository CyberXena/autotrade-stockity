(()=>{
const LOCAL_STORAGE_KEY='trading_bot_state';
const ICON_POSITION_KEY='floating_icon_position'; // ⬅️ tambahan: simpan posisi ikon ☣️
const isAndroid=/android/i.test(navigator.userAgent);
const clamp=(val,min,max)=>Math.max(min,Math.min(val,max));
const formatter=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0});
const defaultState={stakeAwal:14000,martingalePercentage:1.3,maxMartingaleSteps:9,currentIndex:0,isRunning:false,isWaiting:false,nextAction:"buy",actionLock:false,totalModal:0,totalProfit:0,lastStake:[...]
const savedItem=localStorage.getItem(LOCAL_STORAGE_KEY);
const savedState=savedItem?JSON.parse(savedItem):{};
const state={...defaultState,...savedState};

function saveState(){
const stateToSave={stakeAwal:state.stakeAwal,martingalePercentage:state.martingalePercentage,
maxMartingaleSteps:state.maxMartingaleSteps,currentIndex:state.currentIndex,nextAction:state.nextAction,
totalModal:state.totalModal,actualProfit:state.actualProfit,lastStake:state.lastStake,
sessionModal:state.sessionModal,lastSaldoValue:state.lastSaldoValue,targetProfit:state.targetProfit,
winCount:state.winCount,loseCount:state.loseCount,drawCount:state.drawCount,accountType:state.accountType,
lastWinPercentage:state.lastWinPercentage};
localStorage.setItem(LOCAL_STORAGE_KEY,JSON.stringify(stateToSave));}

function resetState(){
localStorage.removeItem(LOCAL_STORAGE_KEY);
Object.assign(state,defaultState);
state.lastSaldoValue=getSaldoValue();
updatePanel();
}

function calculateNextStake(){
return state.currentIndex===0?state.stakeAwal:Math.floor(state.sessionModal*state.martingalePercentage);
}

function getSaldoValue(){
try{
const el=document.querySelector('#qa_trading_balance');
return el?parseInt(el.textContent.trim().replace('Rp','').replace(/\./g,'').replace(',','.'))||0:0;
}catch{return 0;}}

async function setStake(amount){
const input=document.querySelector('.input-controls_input-lower__2ePca');
if(!input)return false;
if(isAndroid&&!input.closest('#winrate-calculator-panel'))input.setAttribute('readonly','readonly');
input.focus();
input.value='';
input.dispatchEvent(new Event('input',{bubbles:true}));
return new Promise(resolve=>{
const attempt=()=>{
if(!state.isRunning)return resolve(false);
input.value=amount;
input.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(()=>{
const val=parseInt(input.value.replace(/[^\d]/g,""));
if(val===amount){
if(isAndroid&&!input.closest('#winrate-calculator-panel'))input.removeAttribute('readonly');
resolve(true);
}else setTimeout(attempt,100);
},100);
};
attempt();
});
}

function clickTrade(type){
const btn=document.querySelector(type==='buy'?'#qa_trading_dealUpButton':'#qa_trading_dealDownButton');
if(btn)btn.click();
}

function checkTargetProfit(){
if(state.targetProfit>0&&state.actualProfit>=state.targetProfit){
state.isRunning=false;
state.actionLock=false;
state.isWaiting=false;
updatePanel();
return true;
}
return false;
}

function getWinPercentage(){
try{
const element=document.querySelector('#qa_trading_incomePercent');
if(!element)return 0;
const text=element.textContent.trim();
const match=text.match(/([-+]?\d+\.?\d*)%/);
return match?parseFloat(match[1]):0;
}catch{return 0;}}

async function performTrade(retryCount=0){
if(!state.isRunning||state.actionLock)return;
if(!state.observerReady&&retryCount<8){
setTimeout(()=>performTrade(retryCount+1),400);
return;
}
if(checkTargetProfit())return;
state.actionLock=true;
state.isWaiting=true;
state.tradeProcessed=false;
let stake=calculateNextStake();
state.lastStake=stake;
state.totalModal+=stake;
state.sessionModal+=stake;
updatePanel();
const LIMIT=74000000;
if(stake>LIMIT){
const success=await performSplitStake(stake,LIMIT);
if(!success){
state.actionLock=false;state.isWaiting=false;return;
}
}else{
const success=await setStake(stake);
if(!success){state.actionLock=false;state.isWaiting=false;return;}
state.lastSaldoValue=getSaldoValue();
clickTrade(state.nextAction);
}
}

// New helper to handle large stakes by splitting into multiple inputs/trades
async function performSplitStake(stake, LIMIT){
/*
  Purpose:
  - Split "stake" into portions not exceeding LIMIT.
  - For each portion: setStake(portion) then clickTrade in the same direction.
  - Keep small delay between clicks to allow the platform to accept multiple consecutive orders.
  - Return true on success, false if interrupted or input element missing.
*/
const input=document.querySelector('.input-controls_input-lower__2ePca');
if(!input)return false;
if(isAndroid&&!input.closest('#winrate-calculator-panel'))input.setAttribute('readonly','readonly');
input.focus();

let remaining=stake;
try{
  while(remaining>0){
    if(!state.isRunning) return false; // abort if bot stopped
    const portion = remaining>LIMIT?LIMIT:remaining;
    remaining -= portion;
    // Use setStake to ensure consistent input behavior (handles Android readonly and retries)
    const ok = await setStake(portion);
    if(!ok) {
      return false;
    }
    // Click the trade button for the current direction (do not toggle direction between portions)
    clickTrade(state.nextAction);
    // Small delay to avoid overwhelming the UI and to allow the trade to register
    await new Promise(res=>setTimeout(res, 300));
  }
  // After all portions, refresh saldo snapshot
  state.lastSaldoValue=getSaldoValue();
  return true;
}finally{
  if(isAndroid&&!input.closest('#winrate-calculator-panel'))input.removeAttribute('readonly');
}
}

function processTradeResult(result,profitAmount=0){
if(!state.isRunning||!state.isWaiting)return;
state.tradeProcessed=true;
if(result==='win'){
const netProfit=state.lastWinPercentage>0?Math.round(state.lastStake*(state.lastWinPercentage/100)):profitAmount;
state.winCount++;
state.actualProfit+=netProfit;
state.sessionModal=0;
state.currentIndex=0;
state.nextAction=state.nextAction==='buy'?'sell':'buy';
}else if(result==='lose'){
state.loseCount++;
state.actualProfit-=state.lastStake;
state.lastWinPercentage=0;
state.currentIndex++;
if(state.currentIndex>=state.maxMartingaleSteps){
state.currentIndex=0;
state.sessionModal=0;
}
state.nextAction=state.nextAction==='buy'?'sell':'buy';
}else if(result==='draw'){
state.drawCount++;
state.totalModal-=state.lastStake;
state.sessionModal-=state.lastStake;
state.lastWinPercentage=0;
}
state.totalProfit=state.actualProfit;
updatePanel();
saveState();
if(checkTargetProfit())return;
setTimeout(()=>{
state.isWaiting=false;
state.actionLock=false;
if(state.isRunning&&!checkTargetProfit())performTrade();
},1000);
}

function extractCurrencyValue(currencyText){
try{return parseInt(currencyText.replace(/[^\d]/g,''))||0;}catch{return 0;}
}

function initToastObserver(){
if(state.toastObserver)state.toastObserver.disconnect();
state.observerReady=false;
state.toastObserver=new MutationObserver(mutations=>{
if(!state.isRunning||!state.isWaiting||state.tradeProcessed)return;
for(const mutation of mutations){
if(mutation.addedNodes.length===0)continue;
const toast=[...mutation.addedNodes].find(node=>node.nodeType===1&&node.querySelector?.('lottie-player'));
if(!toast)continue;
const lottie=toast.querySelector('lottie-player');
if(!lottie)continue;
const isWin=/win\d*/i.test(lottie.className);
const isLose=/lose/i.test(lottie.className);
if(!isWin&&!isLose)continue;
setTimeout(()=>{
if(state.tradeProcessed)return;
const currencyElement=toast.querySelector('.currency');
let resultType='lose';
if(isWin&&currencyElement){
const currencyText=currencyElement.textContent.trim();
const currencyValue=extractCurrencyValue(currencyText);
resultType=currencyValue===state.lastStake?'draw':'win';
}
state.lastWinPercentage=getWinPercentage();
processTradeResult(resultType);
},100);
break;
}
});
state.toastObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{state.observerReady=true;},250);
}

function updateSaldoDisplay(){
const saldoElement=document.getElementById('saldo-display');
if(saldoElement)saldoElement.textContent='Saldo: '+formatter.format(getSaldoValue());
}

function calculateWinRate(){
const totalTrades=state.winCount+state.loseCount;
return totalTrades>0?(state.winCount/totalTrades*100).toFixed(2):'0.00';
}

function updatePanel(){
const now=new Date();
const timeString=now.toTimeString().substring(0,8);
const currentSaldo=getSaldoValue();
const currentStake=calculateNextStake();
const winRate=calculateWinRate();
const hasSavedState=!!localStorage.getItem(LOCAL_STORAGE_KEY)&&!state.isRunning;

let resumePanelHTML='';
if(hasSavedState){
resumePanelHTML=`<div id="resume-panel" style="background:rgba(200,150,0,0.3);padding:8px;border-radius:5px;margin-bottom:8px;text-align:center;">
<div style="font-size:10px;margin-bottom:6px;">Sesi sebelumnya tersimpan</div>
<div style="display:flex;gap:6px;justify-content:center;">
<button id="resume-btn" style="flex:1;padding:6px;background:rgba(0,200,0,0.5);border:none;border-radius:4px;color:white;font-size:10px;">Resume</button>
<button id="reset-btn" style="flex:1;padding:6px;background:rgba(200,0,0,0.5);border:none;border-radius:4px;color:white;font-size:10px;">Reset</button>
</div></div>`;
}

mainPanel.innerHTML=`<div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px;border-radius:6px;background:rgba(0,80,40,0.5);">
<div id="toggle-bot" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;border-radius:5px;background:${state.isRunning?'rgba(255,50,50,0.3)':'rgba(0,180,0,0.3)'};[...]
${state.isRunning?"⏹️ STOP":"▶️ START"}</div>
<div style="font-size:10px;opacity:0.7;margin-left:10px;">${timeString}</div></div>
${resumePanelHTML}
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;margin-bottom:8px;text-align:center;font-size:10px;">
<div id="saldo-display">Saldo:${formatter.format(currentSaldo)}</div></div>
<div style="margin-bottom:10px;">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Profit</div>
<div style="color:${state.actualProfit>=0?'lime':'red'};font-weight:bold;font-size:11px;">${formatter.format(state.actualProfit)}</div></div>
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Winrate</div>
<div style="font-weight:bold;font-size:11px;">${winRate}%</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Win</div>
<div style="color:lime;font-weight:bold;font-size:11px;">${state.winCount}</div></div>
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Lose</div>
<div style="color:red;font-weight:bold;font-size:11px;">${state.loseCount}</div></div>
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Draw</div>
<div style="color:dodgerblue;font-weight:bold;font-size:11px;">${state.drawCount}</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;">Omzet</div>
<div style="font-weight:bold;font-size:11px;">${formatter.format(state.totalModal)}</div></div>
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:6px;text-align:center;">
<div style="font-size:9px;opacity:0.8;display:flex;align-items:center;justify-content:center;">
<span>Entry</span><span style="margin-left:6px;font-size:11px;font-weight:bold;color:lime;">${formatter.format(currentStake)}</span></div>
<input id="stakeAwalInput" type="number" inputmode="numeric" pattern="[0-9]*" value="${state.stakeAwal}" style="width:80px;margin-top:3px;padding:2px 4px;background:rgba(255,255,255,0.1);color:white;b[...]
<div style="background:rgba(0,0,0,0.3);border-radius:5px;padding:8px;font-size:10px;margin-bottom:8px;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Martingale:</span><span>${state.currentIndex+1}/${state.maxMartingaleSteps}</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Action:</span><span style="color:${state.nextAction==='buy'?'#00ff9d':'#ff4d6d'}">${state.nextAction.toUpperCase()}</sp[...]
<div style="position:relative;margin-bottom:8px;">
<button id="settings-btn" style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:none;border-radius:5px;color:white;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:6[...]
<div>⚙️ Pengaturan Martingale</div>
<div style="font-size:12px;transform:rotate(${state.showSettings?180:0}deg);">▼</div>
</button>
<div id="settings-dropdown" style="Display:${state.showSettings?'block':'none'};padding:8px;background:rgba(0,0,0,0.3);border-radius:0 0 5px 5px;margin-top:-5px;">
<div style="margin-bottom:8px;">
<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px;"><span>Persentase:</span>
<select id="martingaleSelect" style="width:85px;padding:2px 4px;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:3px;"${state.isRunning?'disabled':''}>
<option value="1.3"${state.martingalePercentage===1.3?'selected':''}>130%</option>
<option value="1.5"${state.martingalePercentage===1.5?'selected':''}>150%</option>
<option value="2.0"${state.martingalePercentage===2.0?'selected':''}>200%</option>
<option value="2.5"${state.martingalePercentage===2.5?'selected':''}>250%</option></select></div>
<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px;"><span>Max Step:</span>
<input id="maxMartingaleInput" type="number" min="1" max="20" step="1" value="${state.maxMartingaleSteps}" style="width:60px;padding:2px 4px;background:rgba(255,255,255,0.1);color:white;border:none;bo[...]
<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px;"><span>Target Profit:</span>
<div style="display:flex;align-items:center;"><input id="targetProfitInput" type="number" min="0" step="1000" value="${state.targetProfit}" style="width:80px;padding:2px 4px;background:rgba(255,255,25[...]
<div style="display:flex;gap:8px;margin-bottom:8px;">
<div id="switch-account" style="flex:1;background:rgba(0,0,0,0.3);border-radius:5px;padding:8px;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${state.accountType==='real'?'#007bff':'#00c853'};">${state.accountType==='real'?[...]
<div>${state.accountType==='real'?'Akun Riil':'Akun Demo'}</div></div></div>
<div style="margin-top:8px;text-align:center;font-size:16px;opacity:1;font-weight:bold;">&copy; by MochiStoreXD.ID</div>`;

if(document.getElementById('stakeAwalInput')){
document.getElementById('stakeAwalInput').addEventListener('input',e=>{
clearTimeout(state.inputTimer);
state.inputTimer=setTimeout(()=>{
let val=e.target.value.replace(/[^\d]/g,"");
val=val===""?14000:parseInt(val,10);
val=clamp(val,1000,999999999);
e.target.value=val;
state.stakeAwal=val;
saveState();
},300);
});
}

if(document.getElementById('martingaleSelect')){
document.getElementById('martingaleSelect').addEventListener('change',e=>{
state.martingalePercentage=parseFloat(e.target.value)||1.3;
saveState();
});
}

if(document.getElementById('maxMartingaleInput')){
document.getElementById('maxMartingaleInput').addEventListener('change',e=>{
let val=parseInt(e.target.value)||1;
val=clamp(val,1,20);
e.target.value=val;
state.maxMartingaleSteps=val;
saveState();
});
}

if(document.getElementById('targetProfitInput')){
document.getElementById('targetProfitInput').addEventListener('change',e=>{
let val=parseInt(e.target.value)||0;
val=clamp(val,0,999999999);
e.target.value=val;
state.targetProfit=val;
saveState();
});
}

document.getElementById('toggle-bot')?.addEventListener('click',toggleBot);
document.getElementById('switch-account')?.addEventListener('click',switchAccount);
document.getElementById('resume-btn')?.addEventListener('click',resumeBot);
document.getElementById('reset-btn')?.addEventListener('click',resetState);
document.getElementById('settings-btn')?.addEventListener('click',()=>{
state.showSettings=!state.showSettings;
updatePanel();
});
}

// ——— fungsi lain tetap sama ———
function resumeBot(){
state.isRunning=true;
state.actionLock=false;
state.isWaiting=true;
updatePanel();
initToastObserver();
setTimeout(()=>{performTrade();},400);
}

function toggleBot(){
state.isRunning=!state.isRunning;
if(state.isRunning){
clearInterval(state.saldoUpdateInterval);
state.saldoUpdateInterval=setInterval(updateSaldoDisplay,1000);
state.currentIndex=0;
state.nextAction="buy";
state.actionLock=false;
state.isWaiting=true;
state.totalModal=0;
state.sessionModal=0;
state.actualProfit=0;
state.winCount=0;
state.loseCount=0;
state.drawCount=0;
state.lastSaldoValue=getSaldoValue();
updatePanel();
initToastObserver();
setTimeout(()=>{performTrade();},400);
}else{
clearInterval(state.saldoUpdateInterval);
saveState();
updatePanel();
}
}

function switchAccount(){
const accountBtn=document.getElementById('account-btn');
if(accountBtn)accountBtn.click();
setTimeout(()=>{
const targetAccountType=state.accountType==='real'?'demo':'real';
const accountValue=targetAccountType==='demo'?'-1':'-2';
const radioBtn=document.querySelector(`input[type="radio"][value="${accountValue}"]`);
if(radioBtn){
radioBtn.click();
setTimeout(()=>{
state.accountType=targetAccountType;
state.lastSaldoValue=getSaldoValue();
updatePanel();
clickTradeButton();
},500);
}
},300);
}

function clickTradeButton(){
const tradeButton=document.querySelector('vui-button[id="qa_account_changed_trading_button"] button.button_btn__dCMn2');
if(tradeButton)tradeButton.click();
}

// === Panel utama (DOM)
const mainPanel=document.createElement("div");
mainPanel.id="winrate-calculator-panel";
mainPanel.style.cssText='position:fixed;top:10px;right:10px;z-index:999999;background:rgba(0,30,15,0.92);color:white;padding:12px;border-radius:10px;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-s[...]
document.body.appendChild(mainPanel);

/* ============================
   ⬇️ Tambahan fitur: Hide/Show + Ikon ☣️ draggable
   (Tidak mengubah sistem/logic bot; hanya UI tambahan)
============================ */

// 1) Buat ikon ☣️
const toggleIcon=document.createElement("div");
toggleIcon.id="toggle-floating-icon";
toggleIcon.textContent="☣️";
toggleIcon.style.cssText='position:fixed;top:50px;right:10px;z-index:9999999;background:rgba(200,0,0,0.85);color:white;padding:8px;border-radius:50%;font-size:20px;cursor:pointer;display:none;user-sel[...]
document.body.appendChild(toggleIcon);

// Pulihkan posisi ikon (jika ada)
(function restoreIconPos(){
try{
  const pos=JSON.parse(localStorage.getItem(ICON_POSITION_KEY)||'null');
  if(pos&&Number.isFinite(pos.left)&&Number.isFinite(pos.top)){
    toggleIcon.style.left=pos.left+'px';
    toggleIcon.style.top=pos.top+'px';
    toggleIcon.style.right='auto';
  }
}catch{}
})();

// 2) Fungsi hide/show panel
function hidePanel(){ mainPanel.style.display='none'; toggleIcon.style.display='block'; }
function showPanel(){ mainPanel.style.display='flex'; toggleIcon.style.display='none'; }

// 3) Suntik tombol hide kecil di panel TANPA ubah updatePanel asli
function ensureHideBtn(){
  let btn=document.getElementById('mtx-hide-panel-btn');
  if(!btn){
    btn=document.createElement('div');
    btn.id='mtx-hide-panel-btn';
    btn.title='Sembunyikan panel';
    btn.textContent='➖';
    btn.style.cssText='position:absolute;top:6px;left:6px;cursor:pointer;font-size:14px;line-height:14px;padding:2px 4px;border-radius:6px;background:rgba(0,0,0,0.25);';
    btn.addEventListener('click',hidePanel);
  }
  if(!mainPanel.contains(btn)) mainPanel.appendChild(btn);
}

// 4) Patch ringan: setiap updatePanel selesai → pastikan tombol hide ada
const __origUpdatePanel=updatePanel;
updatePanel=function(){
  const r=__origUpdatePanel.apply(this,arguments);
  try{ ensureHideBtn(); }catch(e){}
  return r;
};

// 5) Draggable icon ☣️ (desktop + mobile) + simpan posisi
(function enableDrag(){
  let drag=false, offX=0, offY=0;

  function moveTo(x,y){
    const left=x-offX, top=y-offY;
    toggleIcon.style.left=left+'px';
    toggleIcon.style.top=top+'px';
    toggleIcon.style.right='auto';
    localStorage.setItem(ICON_POSITION_KEY,JSON.stringify({left,top}));
  }

  // Mouse
  toggleIcon.addEventListener('mousedown',e=>{
    drag=true;
    const rect=toggleIcon.getBoundingClientRect();
    offX=e.clientX-rect.left; offY=e.clientY-rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!drag) return;
    moveTo(e.clientX,e.clientY);
  });
  document.addEventListener('mouseup',()=>{drag=false;});

  // Touch (Android/iOS)
  toggleIcon.addEventListener('touchstart',e=>{
    drag=true;
    const t=e.touches[0];
    const rect=toggleIcon.getBoundingClientRect();
    offX=t.clientX-rect.left; offY=t.clientY-rect.top;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!drag) return;
    const t=e.touches[0];
    moveTo(t.clientX,t.clientY);
  },{passive:true});
  document.addEventListener('touchend',()=>{drag=false;});
})();

// Klik ikon untuk memunculkan panel
toggleIcon.addEventListener('click',showPanel);

/* ====== akhir tambahan fitur ====== */

// ——— inisialisasi seperti semula ———
state.saldoUpdateInterval=setInterval(updateSaldoDisplay,1200);
updatePanel(); // ⬅️ tombol hide otomatis disuntik tiap kali updatePanel jalan

window.addEventListener('beforeunload',()=>{
if(state.toastObserver)state.toastObserver.disconnect();
clearInterval(state.saldoUpdateInterval);
saveState();
});

setInterval(saveState,30000);
})();
```
