// Versi dengan error handling
if (!window.Log) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/CyberXena/autotrade-stockity@main/Log.js';
  script.onload = () => console.log('Log.js loaded!');
  script.onerror = () => console.error('Failed to load Log.js');
  document.head.appendChild(script);
}
// binary-bot.js
(() => {

    if (window.binaryBotInjected) return;
    window.binaryBotInjected = true;
    
    // Konfigurasi Martingale
    const stakeList = [
        14000, 18200, 41860, 96278, 221439,
        509311, 1171414, 2694253, 6196782,
        14252599, 32780978
    ];

    // Variabel Status
    let currentIndex = 0;
    let isRunning = false;
    let isWaiting = false;
    let nextAction = "buy";
    let actionLock = false;
    let totalModal = 0;
    let totalProfit = 0;
    let lastStake = 0;
    let sessionModal = 0;
    let lastProfitValue = 0;
    let tradeTimeout = null;
    let retryCount = 0;
    const MAX_RETRY = 3;

    // Inisialisasi Log
    const Log = {
        container: null,
        init: function() {
            this.container = document.getElementById('logContainer');
            if (!this.container) {
                console.warn('Log container not found!');
            }
        },
        add: function(message, isWin) {
            if (!this.container) return;
            
            const now = new Date();
            const timeString = now.toTimeString().substring(0, 8);
            
            const logEntry = document.createElement('div');
            logEntry.style.cssText = `
                padding: 3px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                align-items: center;
                font-size: 10px;
            `;
            
            logEntry.innerHTML = `
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${isWin ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)'}; display: flex; align-items: center; justify-content: center; margin-right: 6px; font-size: 10px;">
                    ${isWin ? '✓' : '✗'}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="color: ${isWin ? 'lime' : '#ff4d6d'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message}</div>
                    <div style="font-size: 8px; opacity: 0.7;">${timeString}</div>
                </div>
            `;
            
            this.container.appendChild(logEntry);
            this.container.scrollTop = this.container.scrollHeight;
        },
        clear: function() {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    };

    // Fungsi Utilitas
    const waitForStartTime = () => {
        return new Promise(resolve => {
            const check = () => {
                if (!isRunning) return;
                
                const clockElement = document.querySelector('p.clock.ng-star-inserted');
                if (!clockElement) return requestAnimationFrame(check);
                
                const clockText = clockElement.textContent.trim();
                const timeParts = clockText.split(' ')[0].split(':');
                const seconds = parseInt(timeParts[2]);
                
                if (seconds >= 59 || seconds <= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    };

    const delay = ms => new Promise(res => {
        if (tradeTimeout) clearTimeout(tradeTimeout);
        tradeTimeout = setTimeout(res, ms);
    });

    const setStake = async (amount) => {
        return new Promise((resolve) => {
            const input = document.querySelector('.input-controls_input-lower__2ePca');
            if (!input) return resolve(false);
            
            input.focus();
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            let confirmed = false;
            const attempt = () => {
                if (!isRunning) return resolve(false);
                input.value = amount;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    const val = parseInt(input.value.replace(/\D/g, ""));
                    if (val === amount) {
                        confirmed = true;
                        resolve(true);
                    } else if (!confirmed) {
                        setTimeout(attempt, 100);
                    }
                }, 100);
            };
            attempt();
        });
    };

    const clickTrade = (type) => {
        const btn = document.querySelector(type === 'buy' ? '#qa_trading_dealUpButton' : '#qa_trading_dealDownButton');
        if (btn) btn.click();
    };

    // Fungsi untuk mengambil nilai profit
    const getProfitValue = () => {
        try {
            const profitElement = document.querySelector('.deals-info .earnings .font-bold-m.text-primary');
            if (!profitElement) return 0;
            
            const profitText = profitElement.textContent.trim();
            const profitValue = parseFloat(profitText.replace(/[^\d.-]/g, ''));
            
            return profitValue || 0;
        } catch (e) {
            console.error('Error reading profit value:', e);
            return 0;
        }
    };

    // Deteksi hasil trade dengan berbagai metode
    const detectTradeResult = (mutations) => {
        // Metode 1: Deteksi animasi lottie-player
        for (const mutation of mutations) {
            const added = [...mutation.addedNodes];
            const lottieWin = added.find(el => el.querySelector?.('lottie-player.win1, lottie-player.win3'));
            const lottieLose = added.find(el => el.querySelector?.('lottie-player.lose'));
            
            if (lottieWin) return 'win';
            if (lottieLose) return 'lose';
        }
        
        // Metode 2: Deteksi perubahan elemen profit
        const currentProfit = getProfitValue();
        if (Math.abs(currentProfit - lastProfitValue) > 10) {
            const result = currentProfit > 0 ? 'win' : 'lose';
            lastProfitValue = currentProfit;
            return result;
        }
        
        // Metode 3: Deteksi toast notifikasi
        for (const mutation of mutations) {
            const added = [...mutation.addedNodes];
            const winToast = added.find(el => 
                el.textContent?.includes('win') || 
                el.textContent?.includes('menang') || 
                el.textContent?.includes('profit')
            );
            
            const loseToast = added.find(el => 
                el.textContent?.includes('lose') || 
                el.textContent?.includes('kalah') || 
                el.textContent?.includes('rugi')
            );
            
            if (winToast) return 'win';
            if (loseToast) return 'lose';
        }
        
        // Metode 4: Deteksi elemen option.win baru
        for (const mutation of mutations) {
            const added = [...mutation.addedNodes];
            const optionWin = added.find(el => 
                el.classList?.contains('option') && el.classList?.contains('win')
            );
            
            const optionLose = added.find(el => 
                el.classList?.contains('option') && el.classList?.contains('lose')
            );
            
            if (optionWin) return 'win';
            if (optionLose) return 'lose';
        }
        
        return null;
    };

    // Fungsi Update UI dengan panel kecil
    const updatePanel = () => {
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);

        mainPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 20px; cursor: move; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)'};">
                    ${isRunning ? "⏹️" : "▶️"}
                </div>
                <div style="font-size: 12px; font-weight: bold; margin-left: 5px;">Mochi Scalper✨</div>
                <div style="font-size: 9px; opacity: 0.7; margin-left: auto;">${timeString}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Profit</div>
                        <div style="color: ${totalProfit >= 0 ? 'lime' : 'red'}; font-weight: bold; font-size: 11px;">${formatter.format(totalProfit)}</div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Modal Sesi</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(sessionModal)}</div>
                    </div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Martingale:</span>
                        <span>${currentIndex + 1}/${stakeList.length}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Next Action:</span>
                        <span style="color: ${nextAction === 'buy' ? '#00ff9d' : '#ff4d6d'}">
                            ${nextAction.toUpperCase()}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Status:</span>
                        <span style="color: ${isWaiting ? 'yellow' : isRunning ? 'lime' : 'red'}">
                            ${isWaiting ? 'WAITING' : isRunning ? 'RUNNING' : 'STOPPED'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; max-height: 120px; overflow-y: auto; font-size: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <span style="font-weight: bold;">Aktivitas</span>
                    <span style="font-size: 9px; opacity: 0.7;">${stakeList[currentIndex].toLocaleString('id-ID')}</span>
                </div>
                <div id="logContainer"></div>
            </div>
        `;

        // Inisialisasi log setelah panel diupdate
        Log.init();
    };

    // Fungsi Trading
    const performTrade = async () => {
        if (!isRunning || actionLock) return;
        actionLock = true;
        isWaiting = false;
        updatePanel();
        
        const stake = stakeList[currentIndex];
        lastStake = stake;
        totalModal += stake;
        sessionModal += stake;
        updatePanel();
        
        const success = await setStake(stake);
        if (!success) {
            actionLock = false;
            return Log.add("GAGAL SET STAKE", false);
        }

        await delay(100);
        clickTrade(nextAction);
        Log.add(`TRADE ${nextAction.toUpperCase()} ${stake.toLocaleString('id-ID')}`, true);
        
        // Simpan nilai profit saat ini untuk deteksi perubahan
        lastProfitValue = getProfitValue();
    };

    // Observer untuk hasil trade
    const observer = new MutationObserver(mutations => {
        if (!isRunning || isWaiting) return;
        
        const result = detectTradeResult(mutations);
        if (!result) return;
        
        isWaiting = true;
        updatePanel();
        
        const isWin = result === 'win';
        let profitAmount = 0;
        
        if (isWin) {
            // Hitung profit berdasarkan nilai saat ini
            const currentProfit = getProfitValue();
            profitAmount = Math.floor(lastStake * (currentProfit / 100));
            totalProfit += profitAmount;
            sessionModal = 0; // Reset modal sesi
            Log.add(`WIN +${profitAmount.toLocaleString('id-ID')} (${currentProfit}%) RESET`, true);
        } else {
            profitAmount = -lastStake;
            totalProfit -= lastStake;
            Log.add(`LOSE -${lastStake.toLocaleString('id-ID')}`, false);
        }

        currentIndex = isWin ? 0 : Math.min(currentIndex + 1, stakeList.length - 1);
        nextAction = nextAction === 'buy' ? 'sell' : 'buy';
        
        updatePanel();

        setTimeout(() => {
            isWaiting = false;
            actionLock = false;
            performTrade();
        }, 300);
    });

    // === ELEMEN UI TERPADU ===
    const mainPanel = document.createElement("div");
    mainPanel.style.cssText = `
        position: fixed;
        top: 100px;
        left: 20px;
        z-index: 999999;
        background: rgba(0, 30, 15, 0.92);
        color: white;
        padding: 12px;
        border-radius: 10px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 11px;
        width: 240px;
        max-height: 320px;
        backdrop-filter: blur(8px);
        box-shadow: 0 5px 25px rgba(0, 200, 100, 0.4);
        border: 1px solid rgba(0, 255, 150, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        user-select: none;
    `;
    document.body.appendChild(mainPanel);

    // Fungsi Drag Panel
    let offsetX, offsetY, isDragging = false;

    const startDrag = (e) => {
        isDragging = true;
        offsetX = e.clientX - mainPanel.offsetLeft;
        offsetY = e.clientY - mainPanel.offsetTop;
        mainPanel.style.cursor = 'grabbing';
        mainPanel.style.boxShadow = '0 5px 30px rgba(0, 255, 150, 0.8)';
    };

    const dragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        mainPanel.style.left = `${e.clientX - offsetX}px`;
        mainPanel.style.top = `${e.clientY - offsetY}px`;
    };

    const endDrag = () => {
        isDragging = false;
        mainPanel.style.cursor = '';
        mainPanel.style.boxShadow = '0 5px 25px rgba(0, 200, 100, 0.4)';
    };

    mainPanel.addEventListener("mousedown", (e) => {
        if (e.target.closest('#logContainer')) return;
        startDrag(e);
    });

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", endDrag);

    // Touch support untuk mobile
    mainPanel.addEventListener("touchstart", (e) => {
        if (e.target.closest('#logContainer')) return;
        const touch = e.touches[0];
        isDragging = true;
        offsetX = touch.clientX - mainPanel.offsetLeft;
        offsetY = touch.clientY - mainPanel.offsetTop;
        mainPanel.style.boxShadow = '0 5px 30px rgba(0, 255, 150, 0.8)';
    });

    document.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        mainPanel.style.left = `${touch.clientX - offsetX}px`;
        mainPanel.style.top = `${touch.clientY - offsetY}px`;
    }, { passive: false });

    document.addEventListener("touchend", endDrag);

    // Toggle Bot
    mainPanel.addEventListener("click", (e) => {
        const toggleBtn = e.target.closest('div[style*="width: 30px;"]');
        if (!toggleBtn) return;
        
        isRunning = !isRunning;
        
        if (isRunning) {
            currentIndex = 0;
            nextAction = "buy";
            actionLock = false;
            isWaiting = true;
            totalModal = 0;
            totalProfit = 0;
            sessionModal = 0;
            lastProfitValue = getProfitValue();
            updatePanel();
            Log.add("BOT DIMULAI - Menunggu waktu trading", true);
            
            waitForStartTime().then(() => {
                if (isRunning) {
                    isWaiting = false;
                    performTrade();
                }
            });
        } else {
            Log.add("BOT DIHENTIKAN", false);
        }
        
        updatePanel();
    });

    // Inisialisasi
    updatePanel();
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        characterData: true, 
        attributes: true,
        attributeFilter: ['class']
    });
    
    Log.add("Bot siap digunakan", true);
    Log.add("Klik ▶️ untuk memulai", true);
})();
