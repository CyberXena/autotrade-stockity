(()=>{
try {
  const style = document.createElement("style");
  style.textContent = `
  #winrate-calculator-panel {
    position:fixed; top:32px; right:32px; z-index:999999;
    background:rgba(10,40,20,0.96);
    color:#f4f4f4;
    padding:20px 18px 14px 18px;
    border-radius:15px;
    font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
    display:flex; flex-direction:column; min-width:290px; max-width:340px; box-shadow: 0 8px 32px 0 rgba(0,0,0,0.28);
    border:1.5px solid #1c3c2f;
    transition: box-shadow 0.2s;
  }
  #winrate-calculator-panel b, #winrate-calculator-panel strong { color:#ffe082 }
  #winrate-calculator-panel select, #winrate-calculator-panel input[type="number"] {
    background:rgba(255,255,255,0.12); color:white; border:none; border-radius:4px; padding:3px 7px; font-size:13px;
  }
  #winrate-calculator-panel .panel-header {
    display:flex; justify-content:space-between; align-items:center;
    margin-bottom:12px; padding-bottom:7px; border-bottom:1px solid #2a5a4f;
  }
  #winrate-calculator-panel .toggle-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:10px;
    padding:8px 0; border-radius:7px;
    background:linear-gradient(90deg,rgba(0,160,50,0.30),rgba(0,60,30,0.25));
    font-size:18px; cursor:pointer; user-select:none; font-weight:bold; transition:.2s;
  }
  #winrate-calculator-panel .toggle-btn.running {
    background:linear-gradient(90deg,rgba(220,50,50,0.30),rgba(100,0,0,0.2));
    color:#ffe082;
  }
  #winrate-calculator-panel .panel-section {
    margin-bottom:14px;
    background:rgba(0,0,0,0.18); border-radius:8px; padding:8px 10px 8px 10px;
    font-size:12px; text-align:center;
  }
  #winrate-calculator-panel .stats-grid {
    display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:7px;
  }
  #winrate-calculator-panel .grid-2 {
    display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:7px;
  }
  #winrate-calculator-panel .stat-card {
    background:rgba(0,0,0,0.22); border-radius:7px; padding:7px; text-align:center;
    box-shadow:0 1px 12px 0 rgba(0,0,0,0.05);
    transition:background .2s; cursor:default;
  }
  #winrate-calculator-panel .stat-card:hover { background:rgba(0,120,80,0.11);}
  #winrate-calculator-panel .stat-label { font-size:10px; opacity:0.74;}
  #winrate-calculator-panel .stat-value { font-size:15px; font-weight:bold; margin-top:2px;}
  #winrate-calculator-panel .profit-pos { color:#aaff7b; }
  #winrate-calculator-panel .profit-neg { color:#ff7b7b;}
  #winrate-calculator-panel .stat-win { color:#90ff99}
  #winrate-calculator-panel .stat-lose { color:#ff8787}
  #winrate-calculator-panel .stat-draw { color:#6ec1ff}
  #winrate-calculator-panel .resume-panel {
    background:rgba(200,170,0,0.11); padding:7px; border-radius:7px; margin-bottom:10px; text-align:center;
    font-size:12px;
  }
  #winrate-calculator-panel .resume-panel button {
    margin:6px 2px 0 2px; padding:5px 14px; border:none; border-radius:6px; font-size:12px;
    background:#14a800; color:#fff; font-weight:bold; cursor:pointer; transition:.18s;
  }
  #winrate-calculator-panel .resume-panel button#reset-btn {
    background:#e53935;
  }
  #winrate-calculator-panel .resume-panel button:hover {
    filter:brightness(1.15);
  }
  #winrate-calculator-panel .settings-btn {
    width:100%;padding:9px 0;background:rgba(0,0,0,0.20);border:none;border-radius:7px;
    color:white;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px;
    font-size:14px; font-weight:bold; letter-spacing:.2px; transition:.18s;
  }
  #winrate-calculator-panel .settings-btn:hover { background:rgba(0,0,0,0.32);}
  #winrate-calculator-panel .settings-dropdown {
    display:none; padding:10px 7px; background:rgba(0,0,0,0.16); border-radius:0 0 7px 7px; margin-top:-5px;
    font-size:12px;
  }
  #winrate-calculator-panel .settings-dropdown.open { display:block; }
  #winrate-calculator-panel .account-switch {
    background:rgba(0,0,0,0.14);border-radius:7px;padding:7px 0;text-align:center;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:7px; font-size:13px;font-weight:bold;
    margin-top:7px; margin-bottom:4px;
    transition:.16s;
  }
  #winrate-calculator-panel .account-switch:hover { background:rgba(25,85,40,0.13);}
  #winrate-calculator-panel .account-indicator {
    width:23px;height:23px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;background:#007bff;color:#fff; font-weight:bold; font-size:15px;
  }
  #winrate-calculator-panel .account-indicator.demo { background:#00c853;}
  #winrate-calculator-panel .copyright {
    text-align:center;font-size:13px;opacity:.72;font-weight:bold;margin-top:12px;margin-bottom:0;
    letter-spacing:.5px;
  }
  #mtx-hide-panel-btn {
    position:absolute;top:6px;left:6px;cursor:pointer;font-size:14px;line-height:14px;
    padding:2px 6px;border-radius:6px;background:rgba(0,0,0,0.25);z-index:2;
    user-select:none; opacity:.78; transition:.15s;
  }
  #mtx-hide-panel-btn:hover { background:rgba(0,0,0,0.35); opacity:1;}
  #toggle-floating-icon {
    position:fixed;top:60px;right:16px;z-index:9999999;background:rgba(200,0,0,0.85);
    color:white;padding:10px;border-radius:50%;font-size:23px;cursor:pointer;display:none;user-select:none;
    box-shadow:0 1px 16px 0 rgba(0,0,0,0.24);
  }
  `;
  document.head.appendChild(style);

  const mainPanel = document.createElement("div");
  mainPanel.id = "winrate-calculator-panel";
  document.body.appendChild(mainPanel);

  const LOCAL_STORAGE_KEY='trading_bot_state';
  const ICON_POSITION_KEY='floating_icon_position';
  const isAndroid=/android/i.test(navigator.userAgent);
  const clamp=(val,min,max)=>Math.max(min,Math.min(val,max));
  const formatter=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0});
  const STAKE_OPTIONS=[14000,15000,20000,30000];
  const defaultState={
    stakeAwal:14000,
    martingalePercentage:1.3,
    maxMartingaleSteps:11,
    currentIndex:0,
    isRunning:false,
    isWaiting:false,
    nextAction:"buy",
    actionLock:false,
    totalModal:0,
    totalProfit:0,
    lastStake:0,
    sessionModal:0,
    actualProfit:0,
    winCount:0,
    loseCount:0,
    drawCount:0,
    accountType:'real',
    lastWinPercentage:0,
    targetProfit:1000000,
    showSettings:false,
    saldoUpdateInterval:null,
    lastSaldoValue:0,
    observerReady:false,
    toastObserver:null,
    tradeProcessed:false,
    inputTimer:null,
  };
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
    localStorage.setItem(LOCAL_STORAGE_KEY,JSON.stringify(stateToSave));
  }

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
    }catch{return 0;}
  }

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
    }catch{return 0;}
  }

  async function performTrade(retryCount=0){
    try {
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

      const success=await setStake(stake);
      if(!success){state.actionLock=false;state.isWaiting=false;return;}
      state.lastSaldoValue=getSaldoValue();
      clickTrade(state.nextAction);
    } catch (e) {
      console.error('[BOT] performTrade error:', e);
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

  function updatePanel() {
    try {
      const now=new Date();
      const timeString=now.toTimeString().substring(0,8);
      const currentSaldo=getSaldoValue();
      const currentStake=calculateNextStake();
      const winRate=calculateWinRate();
      const hasSavedState=!!localStorage.getItem(LOCAL_STORAGE_KEY)&&!state.isRunning;

      let resumePanelHTML='';
      if(hasSavedState){
        resumePanelHTML=`<div class="resume-panel">
        <b>Sesi sebelumnya tersimpan</b><br/>
        <button id="resume-btn">Resume</button>
        <button id="reset-btn">Reset</button>
        </div>`;
      }

      mainPanel.innerHTML=`
      <div class="panel-header">
        <div id="toggle-bot" class="toggle-btn${state.isRunning?' running':''}">
          ${state.isRunning?"⏹️ STOP":"▶️ START"}
        </div>
        <div style="font-size:11px;opacity:0.7;margin-left:13px;">${timeString}</div>
      </div>
      ${resumePanelHTML}
      <div class="panel-section" id="saldo-display">
        <b>Saldo:</b> ${formatter.format(currentSaldo)}
      </div>
      <div class="grid-2">
        <div class="stat-card">
          <div class="stat-label">Profit</div>
          <div class="stat-value ${state.actualProfit>=0?'profit-pos':'profit-neg'}">${formatter.format(state.actualProfit)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Winrate</div>
          <div class="stat-value">${winRate}%</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Win</div>
          <div class="stat-value stat-win">${state.winCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lose</div>
          <div class="stat-value stat-lose">${state.loseCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Draw</div>
          <div class="stat-value stat-draw">${state.drawCount}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="stat-card">
          <div class="stat-label">Omzet</div>
          <div class="stat-value">${formatter.format(state.totalModal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label" style="margin-bottom:4px;">Entry</div>
          <div style="font-size:13px;font-weight:bold;color:#afff90;">${formatter.format(currentStake)}</div>
          <select id="stakeAwalSelect" style="width:100%;margin-top:6px;">
            ${STAKE_OPTIONS.map(opt=>`<option value="${opt}"${state.stakeAwal==opt?' selected':''}>${formatter.format(opt)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="stat-card" style="margin-bottom:7px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span>Kompensasi:</span><span>${state.currentIndex}/${state.maxMartingaleSteps-1}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Action:</span>
          <span style="color:${state.nextAction==='buy'?'#00ff9d':'#ff4d6d'};font-weight:bold;">
            ${state.nextAction.toUpperCase()}
          </span>
        </div>
      </div>
      <button id="settings-btn" class="settings-btn">
        <span>⚙️ Pengaturan Martingale</span>
        <span style="font-size:12px;transform:rotate(${state.showSettings?180:0}deg);">▼</span>
      </button>
      <div id="settings-dropdown" class="settings-dropdown${state.showSettings?' open':''}">
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span>Persentase:</span>
            <select id="martingaleSelect" style="width:85px;"${state.isRunning?'disabled':''}>
              <option value="1.3"${state.martingalePercentage===1.3?'selected':''}>130%</option>
              <option value="1.5"${state.martingalePercentage===1.5?'selected':''}>150%</option>
              <option value="2.0"${state.martingalePercentage===2.0?'selected':''}>200%</option>
              <option value="2.5"${state.martingalePercentage===2.5?'selected':''}>250%</option>
            </select>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span>Max Step:</span>
            <input id="maxMartingaleInput" type="number" min="1" max="100" step="1" value="${state.maxMartingaleSteps}" style="width:64px;"/>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span>Target Profit:</span>
            <input id="targetProfitInput" type="number" min="0" step="1000" value="${state.targetProfit}" style="width:100px;"/>
          </div>
        </div>
        <div id="switch-account" class="account-switch">
          <div class="account-indicator${state.accountType==='demo'?' demo':''}">
            ${state.accountType==='real'?'R':'D'}
          </div>
          <div>${state.accountType==='real'?'Akun Riil':'Akun Demo'}</div>
        </div>
      </div>
      <div class="copyright">&copy; by MochiStoreXD.ID</div>
      `;

      if(document.getElementById('stakeAwalSelect')){
        document.getElementById('stakeAwalSelect').addEventListener('change',e=>{
          let val=parseInt(e.target.value,10);
          if(!STAKE_OPTIONS.includes(val)) val=STAKE_OPTIONS[0];
          state.stakeAwal=val;
          saveState();
          updatePanel();
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
          val=clamp(val,1,100);
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

      ensureHideBtn();
    } catch(e) {
      mainPanel.innerHTML = "<b style='color:red'>Error di updatePanel: " + e.message + "</b>";
      console.error("[BOT] updatePanel error:", e);
    }
  }

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

  const toggleIcon=document.createElement("div");
  toggleIcon.id="toggle-floating-icon";
  toggleIcon.textContent="☣️";
  document.body.appendChild(toggleIcon);

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

  function hidePanel(){ mainPanel.style.display='none'; toggleIcon.style.display='block'; }
  function showPanel(){ mainPanel.style.display='flex'; toggleIcon.style.display='none'; }

  function ensureHideBtn(){
    let btn=document.getElementById('mtx-hide-panel-btn');
    if(!btn){
      btn=document.createElement('div');
      btn.id='mtx-hide-panel-btn';
      btn.title='Sembunyikan panel';
      btn.textContent='➖';
      btn.addEventListener('click',hidePanel);
    }
    if(!mainPanel.contains(btn)) mainPanel.appendChild(btn);
  }

  (function enableDrag(){
    let drag=false, offX=0, offY=0;
    function moveTo(x,y){
      const left=x-offX, top=y-offY;
      toggleIcon.style.left=left+'px';
      toggleIcon.style.top=top+'px';
      toggleIcon.style.right='auto';
      localStorage.setItem(ICON_POSITION_KEY,JSON.stringify({left,top}));
    }
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

  toggleIcon.addEventListener('click',showPanel);

  state.saldoUpdateInterval=setInterval(updateSaldoDisplay,1200);
  updatePanel();

  window.addEventListener('beforeunload',()=>{
    if(state.toastObserver)state.toastObserver.disconnect();
    clearInterval(state.saldoUpdateInterval);
    saveState();
  });

  setInterval(saveState,30000);

} catch(e) {
  alert("[BOT] Error di awal: " + e.message);
  console.error("[BOT] Error detail:", e);
}
})();
