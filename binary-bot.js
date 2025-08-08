(function() {
    'use strict';
    const config = {
        baseAmount: 25000,
        martingalePercentage: 1.3,
        maxMartingaleSteps: 9,
        targetProfit: 100000,
        tradeDuration: 5,
        maxDailyLoss: -100000,
        maxDailyTrades: 20,
        strategy: 'rsi-macd',
        tradingHours: { start: 9, end: 15 }
    };

    const state = {
        balance: 0,
        todayProfit: GM_getValue('todayProfit', 0),
        tradesToday: GM_getValue('tradesToday', 0),
        tradeHistory: GM_getValue('tradeHistory', []),
        winCount: GM_getValue('winCount', 0),
        loseCount: GM_getValue('loseCount', 0),
        drawCount: GM_getValue('drawCount', 0),
        totalModal: GM_getValue('totalModal', 0),
        sessionModal: GM_getValue('sessionModal', 0),
        actualProfit: GM_getValue('actualProfit', 0),
        lastStake: 0,
        currentIndex: 0,
        nextAction: "buy",
        isRunning: false,
        isWaiting: false,
        actionLock: false,
        tradeProcessed: false,
        observerReady: false,
        accountType: 'real',
        showSettings: false,
        activeTab: 'scalping',
        toastObserver: null,
        saldoUpdateInterval: null
    };

    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    function clamp(val, min, max) { return Math.max(min, Math.min(val, max)); }

    function saveState() {
        const stateToSave = { todayProfit: state.todayProfit, tradesToday: state.tradesToday, tradeHistory: state.tradeHistory,
            winCount: state.winCount, loseCount: state.loseCount, drawCount: state.drawCount, totalModal: state.totalModal,
            sessionModal: state.sessionModal, actualProfit: state.actualProfit, currentIndex: state.currentIndex,
            nextAction: state.nextAction, accountType: state.accountType };
        GM_setValue('botState', JSON.stringify(stateToSave));
    }

    function loadState() {
        const savedState = GM_getValue('botState');
        if (savedState) try { Object.assign(state, JSON.parse(savedState)); } catch(e) { console.error('Error loading state:', e); }
    }

    function getSaldoValue() {
        try { const el = document.querySelector('#qa_trading_balance'); 
            return el ? parseInt(el.textContent.trim().replace('Rp', '').replace(/\./g, '')) || 0 : 0; 
        } catch { return 0; }
    }

    function updateSaldoDisplay() {
        const saldoElement = document.getElementById('saldo-display');
        if (saldoElement) saldoElement.textContent = `Saldo: ${formatter.format(getSaldoValue())}`;
    }

    function calculateWinRate() {
        const totalTrades = state.winCount + state.loseCount;
        return totalTrades > 0 ? (state.winCount / totalTrades * 100).toFixed(2) : '0.00';
    }

    function calculateNextStake() {
        return state.currentIndex === 0 ? config.baseAmount : 
            Math.floor(config.baseAmount * Math.pow(config.martingalePercentage, state.currentIndex));
    }

    async function setStake(amount) {
        const input = document.querySelector('.input-controls_input-lower__2ePca');
        if (!input) return false;
        input.focus();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return new Promise(resolve => {
            const attempt = () => {
                if (!state.isRunning) return resolve(false);
                input.value = amount;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                    const val = parseInt(input.value.replace(/[^\d]/g, ""));
                    val === amount ? resolve(true) : setTimeout(attempt, 100);
                }, 100);
            };
            attempt();
        });
    }

    function clickTrade(type) {
        const btn = document.querySelector(type === 'buy' ? '#qa_trading_dealUpButton' : '#qa_trading_dealDownButton');
        if (btn) btn.click();
    }

    function getWinPercentage() {
        try {
            const element = document.querySelector('#qa_trading_incomePercent');
            if (!element) return 0;
            const text = element.textContent.trim();
            const match = text.match(/([-+]?\d+\.?\d*)%/);
            return match ? parseFloat(match[1]) : 0;
        } catch { return 0; }
    }

    async function generateTradeSignal() {
        const rsi = Math.random() * 100;
        const macd = Math.random() > 0.5 ? 1 : -1;
        if (config.strategy === 'scalping') return state.nextAction;
        else if (config.strategy === 'rsi') {
            if (rsi < 30) return 'buy';
            if (rsi > 70) return 'sell';
        }
        else if (config.strategy === 'macd') return macd > 0 ? 'buy' : 'sell';
        else if (config.strategy === 'rsi-macd') {
            if (rsi < 30 && macd > 0) return 'buy';
            if (rsi > 70 && macd < 0) return 'sell';
        }
        return null;
    }

    async function performTrade() {
        if (!state.isRunning || state.actionLock) return;
        state.actionLock = true;
        state.isWaiting = true;
        state.tradeProcessed = false;
        const action = config.strategy === 'scalping' ? state.nextAction : await generateTradeSignal();
        if (!action) { state.actionLock = false; state.isWaiting = false; return; }
        const stake = config.strategy === 'scalping' ? calculateNextStake() : config.baseAmount;
        state.lastStake = stake;
        state.totalModal += stake;
        state.sessionModal += stake;
        updatePanel();
        const success = await setStake(stake);
        if (!success) { state.actionLock = false; state.isWaiting = false; return; }
        await new Promise(res => setTimeout(res, 100));
        clickTrade(action);
        if (config.strategy === 'scalping') config.winPercentage = getWinPercentage();
    }

    function processTradeResult(result) {
        if (!state.isRunning || !state.isWaiting) return;
        state.tradeProcessed = true;
        if (result === 'win') {
            const netProfit = config.strategy === 'scalping' ? Math.round(state.lastStake * (config.winPercentage / 100)) : state.lastStake * 0.8;
            state.winCount++;
            state.actualProfit += netProfit;
            state.todayProfit += netProfit;
            if (config.strategy === 'scalping') { state.sessionModal = 0; state.currentIndex = 0; state.nextAction = state.nextAction === 'buy' ? 'sell' : 'buy'; }
        } else if (result === 'lose') {
            state.loseCount++;
            state.actualProfit -= state.lastStake;
            state.todayProfit -= state.lastStake;
            config.winPercentage = 0;
            if (config.strategy === 'scalping') {
                state.currentIndex++;
                if (state.currentIndex >= config.maxMartingaleSteps) { state.currentIndex = 0; state.sessionModal = 0; }
                state.nextAction = state.nextAction === 'buy' ? 'sell' : 'buy';
            }
        } else if (result === 'draw') {
            state.drawCount++;
            state.totalModal -= state.lastStake;
            state.sessionModal -= state.lastStake;
            config.winPercentage = 0;
        }
        state.tradesToday++;
        updatePanel();
        saveState();
        setTimeout(() => { state.isWaiting = false; state.actionLock = false; if (state.isRunning) performTrade(); }, 1000);
    }

    function initToastObserver() {
        if (state.toastObserver) state.toastObserver.disconnect();
        state.observerReady = false;
        state.toastObserver = new MutationObserver(mutations => {
            if (!state.isRunning || !state.isWaiting || state.tradeProcessed) return;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length === 0) continue;
                const toast = [...mutation.addedNodes].find(node => node.nodeType === 1 && node.querySelector?.('lottie-player'));
                if (!toast) continue;
                const lottie = toast.querySelector('lottie-player');
                if (!lottie) continue;
                const isWin = /win\d*/i.test(lottie.className);
                const isLose = /lose/i.test(lottie.className);
                if (!isWin && !isLose) continue;
                setTimeout(() => {
                    if (state.tradeProcessed) return;
                    const currencyElement = toast.querySelector('.currency');
                    let resultType = 'lose';
                    if (isWin && currencyElement) {
                        const currencyText = currencyElement.textContent.trim();
                        const currencyValue = parseInt(currencyText.replace(/[^\d]/g, '')) || 0;
                        resultType = currencyValue === state.lastStake ? 'draw' : 'win';
                    }
                    processTradeResult(resultType);
                }, 100);
                break;
            }
        });
        state.toastObserver.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { state.observerReady = true; }, 250);
    }

    function createPanel() {
        if (document.getElementById('stockity-bot-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'stockity-bot-panel';
        panel.style.cssText = `position:fixed;top:10px;right:10px;width:300px;background:rgba(0,30,15,0.92);color:white;
            border-radius:12px;padding:15px;z-index:9999;box-shadow:0 0 20px 5px rgba(0,255,150,0.3);border:1px solid rgba(0,255,150,0.5);
            backdrop-filter:blur(8px);font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;user-select:none;`;
        document.body.appendChild(panel);
        updatePanel();
    }

    function updatePanel() {
        const panel = document.getElementById('stockity-bot-panel');
        if (!panel) return;
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        const winRate = calculateWinRate();
        const tabContent = state.activeTab === 'scalping' ? getScalpingTab() : getStrategyTab();
        panel.innerHTML = `
            <div class="bot-header"><div class="bot-title">Stockity Trading Bot</div><div class="bot-time">${timeString}</div></div>
            <div class="tabs"><button class="tab ${state.activeTab === 'scalping' ? 'active' : ''}" data-tab="scalping">Scalping</button>
            <button class="tab ${state.activeTab === 'strategy' ? 'active' : ''}" data-tab="strategy">Strategi</button></div>
            <div class="tab-content">${tabContent}</div>
            <div class="bot-status">Status: ${state.isRunning ? (state.isWaiting ? 'Menunggu hasil trade...' : 'Aktif') : 'Nonaktif'}</div>
            <div class="bot-controls"><button id="toggle-bot" class="${state.isRunning ? 'stop' : 'start'}">${state.isRunning ? '⏹️ Stop' : '▶️ Start'}</button>
            <button id="reset-btn">🔄 Reset</button></div><div class="bot-footer">© ${new Date().getFullYear()} Stockity Bot</div>`;
        const style = document.createElement('style');
        style.textContent = `.bot-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);}
            .bot-title{font-size:18px;font-weight:bold;background:linear-gradient(90deg,#0ea5e9,#22c55e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
            .bot-time{font-size:14px;opacity:0.8;}.tabs{display:flex;margin-bottom:15px;background:rgba(255,255,255,0.05);border-radius:8px;padding:4px;}
            .tab{flex:1;padding:8px;text-align:center;background:none;border:none;color:white;cursor:pointer;border-radius:6px;transition:all 0.3s;}
            .tab.active{background:rgba(0,230,150,0.3);font-weight:bold;}.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:15px;}
            .stat-card{background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center;}.stat-label{font-size:12px;opacity:0.7;margin-bottom:5px;}
            .stat-value{font-size:16px;font-weight:bold;}.profit{color:#22c55e;}.loss{color:#ef4444;}.input-group{margin-bottom:12px;}
            .input-label{display:block;margin-bottom:5px;font-size:13px;opacity:0.8;}.input-field{width:100%;padding:8px 12px;background:rgba(255,255,255,0.1);
            border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:white;font-size:14px;}.input-field:disabled{opacity:0.5;}
            .bot-status{text-align:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:15px;font-size:14px;}
            .bot-controls{display:flex;gap:10px;}.bot-controls button{flex:1;padding:12px;border:none;border-radius:8px;color:white;font-weight:bold;cursor:pointer;transition:all 0.2s;}
            #toggle-bot.start{background:linear-gradient(90deg,#0ea5e9,#22c55e);}#toggle-bot.stop{background:linear-gradient(90deg,#ef4444,#f59e0b);}
            #reset-btn{background:rgba(255,255,255,0.1);}.bot-footer{text-align:center;margin-top:15px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;opacity:0.7;}`;
        panel.appendChild(style);
        panel.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => { state.activeTab = tab.dataset.tab; updatePanel(); });
        });
        document.getElementById('toggle-bot').addEventListener('click', toggleBot);
        document.getElementById('reset-btn').addEventListener('click', resetBot);
        if (state.activeTab === 'scalping') {
            document.getElementById('baseAmount')?.addEventListener('input', e => { config.baseAmount = parseInt(e.target.value) || 25000; saveState(); });
            document.getElementById('martingale')?.addEventListener('change', e => { config.martingalePercentage = parseFloat(e.target.value); saveState(); });
            document.getElementById('maxSteps')?.addEventListener('input', e => { config.maxMartingaleSteps = parseInt(e.target.value) || 9; saveState(); });
            document.getElementById('targetProfit')?.addEventListener('input', e => { config.targetProfit = parseInt(e.target.value) || 100000; saveState(); });
        } else {
            document.getElementById('tradeDuration')?.addEventListener('change', e => { config.tradeDuration = parseInt(e.target.value); saveState(); });
            document.getElementById('maxTrades')?.addEventListener('input', e => { config.maxDailyTrades = parseInt(e.target.value) || 20; saveState(); });
            document.getElementById('strategySelect')?.addEventListener('change', e => { config.strategy = e.target.value; saveState(); });
        }
    }

    function getScalpingTab() {
        return `<div class="stats-grid"><div class="stat-card"><div class="stat-label">Profit Hari Ini</div><div class="stat-value ${state.actualProfit >= 0 ? 'profit' : 'loss'}">${formatter.format(state.actualProfit)}</div></div>
            <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value">${calculateWinRate()}%</div></div>
            <div class="stat-card"><div class="stat-label">Win</div><div class="stat-value profit">${state.winCount}</div></div>
            <div class="stat-card"><div class="stat-label">Lose</div><div class="stat-value loss">${state.loseCount}</div></div></div>
            <div class="input-group"><label class="input-label">Jumlah Dasar (Rp)</label><input id="baseAmount" type="number" class="input-field" value="${config.baseAmount}" ${state.isRunning ? 'disabled' : ''}></div>
            <div class="input-group"><label class="input-label">Persentase Martingale</label><select id="martingale" class="input-field" ${state.isRunning ? 'disabled' : ''}>
            <option value="1.3" ${config.martingalePercentage === 1.3 ? 'selected' : ''}>130%</option><option value="1.5" ${config.martingalePercentage === 1.5 ? 'selected' : ''}>150%</option>
            <option value="2.0" ${config.martingalePercentage === 2.0 ? 'selected' : ''}>200%</option><option value="2.5" ${config.martingalePercentage === 2.5 ? 'selected' : ''}>250%</option></select></div>
            <div class="input-group"><label class="input-label">Maks. Langkah Martingale</label><input id="maxSteps" type="number" class="input-field" value="${config.maxMartingaleSteps}" min="1" max="20" ${state.isRunning ? 'disabled' : ''}></div>
            <div class="input-group"><label class="input-label">Target Profit (Rp)</label><input id="targetProfit" type="number" class="input-field" value="${config.targetProfit}" ${state.isRunning ? 'disabled' : ''}></div>
            <div class="stat-card" style="margin-top:10px;text-align:center;"><div class="stat-label">Entry Berikutnya</div><div class="stat-value" style="font-size:18px;">${formatter.format(calculateNextStake())}</div></div>`;
    }

    function getStrategyTab() {
        return `<div class="stats-grid"><div class="stat-card"><div class="stat-label">Profit Hari Ini</div><div class="stat-value ${state.todayProfit >= 0 ? 'profit' : 'loss'}">${formatter.format(state.todayProfit)}</div></div>
            <div class="stat-card"><div class="stat-label">Trade Hari Ini</div><div class="stat-value">${state.tradesToday}/${config.maxDailyTrades}</div></div>
            <div class="stat-card"><div class="stat-label">Total Modal</div><div class="stat-value">${formatter.format(state.totalModal)}</div></div>
            <div class="stat-card"><div class="stat-label">Aksi Berikutnya</div><div class="stat-value" style="color:${state.nextAction === 'buy' ? '#00ff9d' : '#ff4d6d'}">${state.nextAction.toUpperCase()}</div></div></div>
            <div class="input-group"><label class="input-label">Durasi Trade (menit)</label><select id="tradeDuration" class="input-field" ${state.isRunning ? 'disabled' : ''}>
            <option value="1" ${config.tradeDuration === 1 ? 'selected' : ''}>1 Menit</option><option value="5" ${config.tradeDuration === 5 ? 'selected' : ''}>5 Menit</option>
            <option value="15" ${config.tradeDuration === 15 ? 'selected' : ''}>15 Menit</option><option value="30" ${config.tradeDuration === 30 ? 'selected' : ''}>30 Menit</option></select></div>
            <div class="input-group"><label class="input-label">Maks. Trade Harian</label><input id="maxTrades" type="number" class="input-field" value="${config.maxDailyTrades}" min="1" max="100" ${state.isRunning ? 'disabled' : ''}></div>
            <div class="input-group"><label class="input-label">Strategi Trading</label><select id="strategySelect" class="input-field" ${state.isRunning ? 'disabled' : ''}>
            <option value="scalping" ${config.strategy === 'scalping' ? 'selected' : ''}>Scalping</option><option value="rsi" ${config.strategy === 'rsi' ? 'selected' : ''}>RSI</option>
            <option value="macd" ${config.strategy === 'macd' ? 'selected' : ''}>MACD</option><option value="rsi-macd" ${config.strategy === 'rsi-macd' ? 'selected' : ''}>RSI + MACD</option></select></div>
            <div class="input-group"><label class="input-label">Jam Trading (WIB)</label><div style="display:flex;gap:5px;">
            <input type="number" class="input-field" value="${config.tradingHours.start}" min="0" max="23" disabled><span style="line-height:38px;">-</span>
            <input type="number" class="input-field" value="${config.tradingHours.end}" min="0" max="23" disabled></div></div>
            <div class="stat-card" style="margin-top:10px;text-align:center;background:rgba(0,150,255,0.1);"><div class="stat-label">Saldo Akun</div>
            <div class="stat-value" id="saldo-display">${formatter.format(getSaldoValue())}</div></div>`;
    }

    function toggleBot() {
        state.isRunning = !state.isRunning;
        if (state.isRunning) {
            clearInterval(state.saldoUpdateInterval);
            state.saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
            state.lastSaldoValue = getSaldoValue();
            if (config.strategy === 'scalping') {
                state.currentIndex = 0;
                state.nextAction = "buy";
                state.actionLock = false;
                state.isWaiting = true;
                state.totalModal = 0;
                state.sessionModal = 0;
                state.actualProfit = 0;
                state.winCount = 0;
                state.loseCount = 0;
                state.drawCount = 0;
            }
            updatePanel();
            initToastObserver();
            setTimeout(() => { performTrade(); }, 400);
        } else {
            clearInterval(state.saldoUpdateInterval);
            saveState();
            updatePanel();
        }
    }

    function resetBot() {
        state.todayProfit = 0;
        state.tradesToday = 0;
        state.tradeHistory = [];
        state.winCount = 0;
        state.loseCount = 0;
        state.drawCount = 0;
        state.totalModal = 0;
        state.sessionModal = 0;
        state.actualProfit = 0;
        state.currentIndex = 0;
        state.nextAction = "buy";
        saveState();
        updatePanel();
    }

    loadState();
    createPanel();
    state.saldoUpdateInterval = setInterval(updateSaldoDisplay, 5000);
    window.addEventListener('beforeunload', () => {
        if (state.toastObserver) state.toastObserver.disconnect();
        clearInterval(state.saldoUpdateInterval);
        saveState();
    });
})();
