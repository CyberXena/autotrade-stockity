(() => {
    // --- Utility ---
    const isAndroid = /android/i.test(navigator.userAgent);
    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    function showToast(msg, color = '#c0392b') {
        let el = document.getElementById('mochi-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'mochi-toast';
            el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#222;padding:8px 18px;color:#fff;font-size:12px;border-radius:6px;z-index:1000001;box-shadow:0 2px 12px #000;opacity:.95;transition:opacity .2s;';
            document.body.appendChild(el);
        }
        el.style.background = color;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.opacity = '0.95';
        setTimeout(() => { el.style.opacity = '0'; }, 1300);
        setTimeout(() => { el.style.display = 'none'; }, 1550);
    }

    // --- State ---
    const state = {
        stakeAwal: 14000,
        martingalePercentage: 1.3,
        maxMartingaleSteps: 11,
        currentIndex: 0,
        isRunning: false,
        isWaiting: false,
        nextAction: "buy",
        actionLock: false,
        totalModal: 0,
        totalProfit: 0,
        lastStake: 0,
        sessionModal: 0,
        lastSaldoValue: 0,
        targetProfit: 0,
        tradeProcessed: false,
        toastObserver: null,
        saldoUpdateInterval: null,
        accountType: 'real',
        lastWinPercentage: 0,
        lastTradeResult: null,
        drag: { offsetX:0, offsetY:0, isDragging:false },
        observerReady: false,
    };

    function getWinPercentage() {
        try {
            const el = document.querySelector('#qa_trading_incomePercent div');
            if (!el) return 0;
            const match = el.textContent.trim().match(/(\d+)%/);
            return match ? parseInt(match[1]) : 0;
        } catch { return 0; }
    }

    function calculateNextStake() {
        return state.currentIndex === 0 ? state.stakeAwal : (state.sessionModal * state.martingalePercentage);
    }

    function getSaldoValue() {
        try {
            const el = document.querySelector('#qa_trading_balance');
            if (!el) return 0;
            let txt = el.textContent.trim().replace('Rp', '').replace(/\./g, '').replace(',', '.');
            return parseInt(txt) || 0;
        } catch { return 0; }
    }

    async function setStake(amount) {
        const input = document.querySelector('.input-controls_input-lower__2ePca');
        if (!input) { showToast('Kolom entry tidak ditemukan!', 'red'); return false; }
        if (isAndroid && !input.closest('#mochi-scalper-panel')) input.setAttribute('readonly', 'readonly');
        input.focus();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        let confirmed = false;
        return new Promise(resolve => {
            const attempt = () => {
                if (!state.isRunning) return resolve(false);
                input.value = amount;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                    const val = parseInt(input.value.replace(/[^\d]/g, ""));
                    if (val === amount) {
                        confirmed = true;
                        if (isAndroid && !input.closest('#mochi-scalper-panel')) input.removeAttribute('readonly');
                        resolve(true);
                    } else if (!confirmed) setTimeout(attempt, 100);
                }, 100);
            };
            attempt();
        });
    }

    function clickTrade(type) {
        const btn = document.querySelector(type === 'buy' ? '#qa_trading_dealUpButton' : '#qa_trading_dealDownButton');
        if (btn) btn.click();
        else showToast("Tombol trading tidak ditemukan", "#c0392b");
    }

    function checkTargetProfit() {
        if (state.targetProfit > 0 && state.totalProfit >= state.targetProfit) {
            state.isRunning = false; state.actionLock = false; state.isWaiting = false; updatePanel();
            showToast("Target profit tercapai!", "#2ecc40");
            return true;
        }
        return false;
    }

    async function performTrade(retryCount=0) {
        if (!state.isRunning || state.actionLock) return;
        if (!state.observerReady) {
            if (retryCount < 8) setTimeout(() => performTrade(retryCount+1), 400);
            else showToast("Bot gagal start: observer tidak siap!", "red");
            return;
        }
        if (checkTargetProfit()) return;

        state.actionLock = true; state.isWaiting = true; state.tradeProcessed = false; state.lastTradeResult = null; updatePanel();

        const stake = calculateNextStake();
        state.lastStake = stake;
        if (!state.tradeProcessed) { state.totalModal += stake; state.sessionModal += stake; }
        updatePanel();

        const success = await setStake(stake);
        if (!success) { state.actionLock = false; state.isWaiting = false; return; }

        await new Promise(res => setTimeout(res, 100));
        state.lastSaldoValue = getSaldoValue();
        clickTrade(state.nextAction);
    }

    function processTradeResult(result, profitAmount = 0) {
        if (!state.isRunning || !state.isWaiting) return;
        state.tradeProcessed = true;
        if (result === 'win') {
            const netProfit = state.lastWinPercentage > 0 ? Math.round(state.lastStake * (state.lastWinPercentage / 100)) : profitAmount;
            state.totalProfit += netProfit; state.sessionModal = 0; state.currentIndex = 0; state.nextAction = state.nextAction === 'buy' ? 'sell' : 'buy';
        } else if (result === 'lose') {
            state.totalProfit += profitAmount; state.lastWinPercentage = 0;
            if (state.currentIndex === state.maxMartingaleSteps - 1) { state.currentIndex = 0; state.sessionModal = 0; }
            else { state.currentIndex = Math.min(state.currentIndex + 1, state.maxMartingaleSteps - 1); }
            state.nextAction = state.nextAction === 'buy' ? 'sell' : 'buy';
        } else if (result === 'draw') {
            state.totalModal -= state.lastStake; state.sessionModal -= state.lastStake; state.lastWinPercentage = 0;
        }
        updatePanel();
        if (checkTargetProfit()) return;
        setTimeout(() => {
            state.isWaiting = false; state.actionLock = false;
            if (state.isRunning && !checkTargetProfit()) performTrade();
        }, 1000);
    }

    function initToastObserver() {
        if (state.toastObserver) { state.toastObserver.disconnect(); state.toastObserver = null; }
        state.observerReady = false;
        state.toastObserver = new MutationObserver(mutations => {
            if (!state.isRunning || !state.isWaiting || state.tradeProcessed) return;
            for (const mutation of mutations) {
                const added = [...mutation.addedNodes];
                const toast = added.find(node => node.nodeType === 1 && node.querySelector?.('lottie-player'));
                if (toast) {
                    const lottie = toast.querySelector('lottie-player');
                    if (!lottie) continue;
                    const isWin = /win\d*/i.test(lottie.className);
                    const isLose = /lose/i.test(lottie.className);
                    const isDraw = /draw/i.test(lottie.className);
                    if (isWin || isLose || isDraw) {
                        setTimeout(() => {
                            if (state.tradeProcessed) return;
                            const currentSaldo = getSaldoValue();
                            const profitAmount = currentSaldo - state.lastSaldoValue;
                            state.lastWinPercentage = isWin ? getWinPercentage() : 0;
                            let resultType = isWin ? 'win' : isLose ? 'lose' : 'draw';
                            state.lastTradeResult = resultType;
                            processTradeResult(resultType, profitAmount);
                        }, 100);
                    }
                    break;
                }
            }
        });
        state.toastObserver.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { state.observerReady = true; }, 250);
    }

    function updateSaldoDisplay() {
        const saldoElement = document.getElementById('saldo-display');
        if (saldoElement) saldoElement.textContent = 'Saldo: ' + formatter.format(getSaldoValue());
    }

    // --- UI Panel ---
    function updatePanel() {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        const currentSaldo = getSaldoValue();
        const currentStake = calculateNextStake();
        let resultColor = 'gray';
        if (state.lastTradeResult === 'win') resultColor = 'lime';
        else if (state.lastTradeResult === 'lose') resultColor = 'red';
        else if (state.lastTradeResult === 'draw') resultColor = 'yellow';
        let resultText = '-';
        if (state.lastTradeResult === 'win') resultText = 'WIN';
        else if (state.lastTradeResult === 'lose') resultText = 'LOSE';
        else if (state.lastTradeResult === 'draw') resultText = 'DRAW';

        mainPanel.innerHTML = `
            <div id="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); cursor: move;">
                <div style="font-size: 16px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    <div id="toggle-bot" style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${state.isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)'};">
                        ${state.isRunning ? "⏹️" : "▶️"}
                    </div>
                    <div>Mochi Scalper✨</div>
                </div>
                <div style="font-size: 10px; opacity: 0.7;">${timeString}</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; margin-bottom: 8px; text-align: center; font-size: 10px;">
                <div id="saldo-display">Saldo: ${formatter.format(currentSaldo)}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Profit</div>
                        <div style="color: ${state.totalProfit >= 0 ? 'lime' : 'red'}; font-weight: bold; font-size: 11px;">${formatter.format(state.totalProfit)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Modal Sesi</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(state.sessionModal)}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Omzet</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(state.totalModal)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8; display: flex; align-items: center; justify-content: center;">
                            <span>Entry</span>
                            <span style="margin-left:6px;font-size:11px;font-weight:bold;color:lime;">${formatter.format(currentStake)}</span>
                        </div>
                        <input id="stakeAwalInput" type="number" inputmode="numeric" pattern="[0-9]*" value="${state.stakeAwal}" style="width: 80px; margin-top: 3px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px; text-align: right;" ${state.isRunning ? 'disabled' : ''} autocomplete="off">
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Martingale:</span>
                        <select id="martingaleSelect" style="width: 85px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px;" ${state.isRunning ? 'disabled' : ''}>
                            <option value="1.3" ${state.martingalePercentage === 1.3 ? 'selected' : ''}>130%</option>
                            <option value="1.5" ${state.martingalePercentage === 1.5 ? 'selected' : ''}>150%</option>
                            <option value="2.0" ${state.martingalePercentage === 2.0 ? 'selected' : ''}>200%</option>
                            <option value="2.5" ${state.martingalePercentage === 2.5 ? 'selected' : ''}>250%</option>
                        </select>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Max Step Kompen:</span>
                        <input id="maxMartingaleInput" type="number" min="1" max="20" step="1" value="${state.maxMartingaleSteps}" style="width: 60px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px; text-align: right;" ${state.isRunning ? 'disabled' : ''}>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Target Profit:</span>
                        <div style="display: flex; align-items: center;">
                            <input id="targetProfitInput" type="number" min="0" step="1000" value="${state.targetProfit}" style="width: 80px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px; text-align: right; margin-right: 5px;">
                            <span>IDR</span>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Martingale:</span>
                        <span>${state.currentIndex + 1}/${state.maxMartingaleSteps}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Action:</span>
                        <span style="color: ${state.nextAction === 'buy' ? '#00ff9d' : '#ff4d6d'}">
                            ${state.nextAction.toUpperCase()}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Win Terakhir:</span>
                        <span style="color: ${state.lastWinPercentage > 0 ? 'lime' : 'gray'}">
                            ${state.lastWinPercentage > 0 ? state.lastWinPercentage + '%' : '-'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Hasil Terakhir:</span>
                        <span style="color: ${resultColor}">
                            ${resultText}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Status:</span>
                        <span style="color: ${state.isWaiting ? 'yellow' : state.isRunning ? 'lime' : 'red'}">
                            ${state.isWaiting ? 'WAITING' : state.isRunning ? 'RUNNING' : 'STOPPED'}
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <div id="switch-account" style="flex: 1; background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${state.accountType === 'real' ? '#007bff' : '#00c853'};">
                            ${state.accountType === 'real' ? 'R' : 'D'}
                        </div>
                        <div>
                            ${state.accountType === 'real' ? 'Akun Riil' : 'Akun Demo'}
                        </div>
                    </div>
                </div>
                <div style="margin-top:8px; text-align:center; font-size:10px; opacity:0.6;">
                    &copy; by MochiStoreXD.ID
                </div>
            </div>
        `;

        // --- Event Handler Section ---
        const stakeAwalInput = document.getElementById('stakeAwalInput');
        if (stakeAwalInput) {
            let tmo;
            stakeAwalInput.addEventListener('input', (e) => {
                clearTimeout(tmo);
                tmo = setTimeout(() => {
                    // Only allow integer (tanpa koma/titik)
                    let val = stakeAwalInput.value.replace(/[^\d]/g, "");
                    val = val === "" ? 14000 : parseInt(val, 10);
                    val = clamp(val, 1000, 999999999);
                    stakeAwalInput.value = val;
                    state.stakeAwal = val;
                    updatePanel();
                }, 120);
            });
            stakeAwalInput.addEventListener('focus', (e) => stakeAwalInput.select());
            if (isAndroid) {
                stakeAwalInput.setAttribute('readonly', 'readonly');
                stakeAwalInput.addEventListener('focus', function() { this.removeAttribute('readonly'); });
                stakeAwalInput.addEventListener('blur', function() { this.setAttribute('readonly', 'readonly'); });
            }
        }
        const martingaleSelect = document.getElementById('martingaleSelect');
        if (martingaleSelect) martingaleSelect.addEventListener('change', (e) => {
            state.martingalePercentage = parseFloat(e.target.value) || 1.3;
            updatePanel();
        });
        const maxMartingaleInput = document.getElementById('maxMartingaleInput');
        if (maxMartingaleInput) maxMartingaleInput.addEventListener('change', (e) => {
            let val = parseInt(maxMartingaleInput.value) || 1;
            val = clamp(val, 1, 20);
            maxMartingaleInput.value = val;
            state.maxMartingaleSteps = val;
            updatePanel();
        });
        const targetInput = document.getElementById('targetProfitInput');
        if (targetInput) targetInput.addEventListener('change', (e) => {
            let val = parseInt(targetInput.value) || 0;
            val = clamp(val, 0, 999999999);
            targetInput.value = val;
            state.targetProfit = val;
        });
        document.getElementById('switch-account')?.addEventListener('click', switchAccount);
        const toggleBot = document.getElementById('toggle-bot');
        if (toggleBot) toggleBot.addEventListener('click', () => {
            state.isRunning = !state.isRunning;
            if (state.isRunning) {
                if (state.saldoUpdateInterval) clearInterval(state.saldoUpdateInterval);
                state.saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
                state.currentIndex = 0; state.nextAction = "buy"; state.actionLock = false; state.isWaiting = true;
                state.totalModal = 0; state.sessionModal = 0; state.totalProfit = 0; state.lastWinPercentage = 0; state.lastTradeResult = null;
                state.lastSaldoValue = getSaldoValue();
                updatePanel();
                initToastObserver();
                setTimeout(() => { performTrade(); }, 400);
            } else {
                if (state.saldoUpdateInterval) clearInterval(state.saldoUpdateInterval);
                updatePanel();
            }
        });
        setupDrag();
    }

    function setupDrag() {
        const header = document.getElementById('panel-header');
        if (!header) return;
        header.onmousedown = e => {
            state.drag.isDragging = true;
            state.drag.offsetX = e.clientX - mainPanel.offsetLeft;
            state.drag.offsetY = e.clientY - mainPanel.offsetTop;
            mainPanel.style.cursor = 'grabbing';
            mainPanel.style.boxShadow = '0 0 15px 3px rgba(0, 255, 0, 0.8)';
        };
        header.ontouchstart = e => {
            const touch = e.touches[0];
            state.drag.isDragging = true;
            state.drag.offsetX = touch.clientX - mainPanel.offsetLeft;
            state.drag.offsetY = touch.clientY - mainPanel.offsetTop;
            mainPanel.style.boxShadow = '0 0 15px 3px rgba(0, 255, 0, 0.8)';
        };
    }
    document.addEventListener("mousemove", e => {
        if (!state.drag.isDragging) return;
        e.preventDefault();
        mainPanel.style.left = (e.clientX - state.drag.offsetX) + 'px';
        mainPanel.style.top = (e.clientY - state.drag.offsetY) + 'px';
    });
    document.addEventListener("mouseup", () => {
        state.drag.isDragging = false;
        mainPanel.style.cursor = '';
        mainPanel.style.boxShadow = '0 0 10px 2px rgba(0, 255, 0, 0.5)';
    });
    document.addEventListener("touchmove", e => {
        if (!state.drag.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        mainPanel.style.left = (touch.clientX - state.drag.offsetX) + 'px';
        mainPanel.style.top = (touch.clientY - state.drag.offsetY) + 'px';
    });
    document.addEventListener("touchend", () => {
        state.drag.isDragging = false;
        mainPanel.style.cursor = '';
        mainPanel.style.boxShadow = '0 0 10px 2px rgba(0, 255, 0, 0.5)';
    });

    // --- Akun Switch ---
    function switchAccount() {
        const accountBtn = document.getElementById('account-btn');
        if (accountBtn) accountBtn.click();
        setTimeout(() => {
            const targetAccountType = state.accountType === 'real' ? 'demo' : 'real';
            const accountValue = targetAccountType === 'demo' ? '-1' : '-2';
            const radioBtn = document.querySelector(`input[type="radio"][value="${accountValue}"]`);
            if (radioBtn) {
                radioBtn.click();
                setTimeout(() => clickTradeButton(), 500);
                setTimeout(() => {
                    state.accountType = targetAccountType;
                    state.lastSaldoValue = getSaldoValue();
                    updatePanel();
                }, 1000);
            }
        }, 300);
    }

    function clickTradeButton() {
        const tradeButton = document.querySelector('vui-button[id="qa_account_changed_trading_button"] button.button_btn__dCMn2');
        if (tradeButton) { tradeButton.click(); return; }
        const buttons = document.querySelectorAll('button.button_btn__dCMn2');
        for (const button of buttons) {
            const span = button.querySelector('span.button_text-wrapper__3nklk');
            if (span && span.textContent.trim() === 'Berdagang') { button.click(); break; }
        }
    }

    // --- Panel utama ---
    const mainPanel = document.createElement("div");
    mainPanel.id = "mochi-scalper-panel";
    mainPanel.style.cssText = 'position: fixed;top: 100px;left: 20px;z-index: 999999;background: rgba(0, 30, 15, 0.92);color: white;padding: 12px;border-radius: 10px;font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;font-size: 11px;width: 240px;backdrop-filter: blur(8px);box-shadow: 0 0 10px 2px rgba(0, 255, 0, 0.5);border: 1px solid rgba(0, 255, 150, 0.5);display: flex;flex-direction: column;overflow: hidden;user-select: none;';
    document.body.appendChild(mainPanel);

    // --- saldo interval dan panel update ---
    state.saldoUpdateInterval = setInterval(updateSaldoDisplay, 1200);
    updatePanel();

    // --- Cleanup on unload (browser/tab close) ---
    window.addEventListener('beforeunload', () => {
        if (state.toastObserver) state.toastObserver.disconnect();
        if (state.saldoUpdateInterval) clearInterval(state.saldoUpdateInterval);
    });
})();
