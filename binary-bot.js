(() => {
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
    let lastSaldoValue = 0;
    let targetProfit = 0;
    let tradeProcessed = false;
    let clockObserver = null;

    // Formatter mata uang
    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

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
            logEntry.style.cssText = 'padding: 3px 0;' +
                'border-bottom: 1px solid rgba(255,255,255,0.1);' +
                'display: flex;' +
                'align-items: center;' +
                'font-size: 10px;';
            
            logEntry.innerHTML = '<div style="width: 16px; height: 16px; border-radius: 50%; background: ' + 
                (isWin ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)') + 
                '; display: flex; align-items: center; justify-content: center; margin-right: 6px; font-size: 10px;">' +
                (isWin ? '✓' : '✗') +
                '</div>' +
                '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: ' + (isWin ? 'lime' : '#ff4d6d') + '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + message + '</div>' +
                '<div style="font-size: 8px; opacity: 0.7;">' + timeString + '</div>' +
                '</div>';
            
            this.container.appendChild(logEntry);
            this.container.scrollTop = this.container.scrollHeight;
        },
        clear: function() {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    };

    const delay = ms => new Promise(res => setTimeout(res, ms));

    const setStake = async (amount) => {
        return new Promise((resolve) => {
            const input = document.querySelector('.input-controls_input-lower__2ePca');
            if (!input) return resolve(false);
            
            // Cegah keyboard muncul (hanya untuk input stake)
            input.setAttribute('readonly', 'true');
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
                        input.removeAttribute('readonly');
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

    // Fungsi untuk mendapatkan nilai saldo
    const getSaldoValue = () => {
        try {
            const saldoElement = document.querySelector('#qa_trading_balance');
            if (!saldoElement) return 0;
            
            const saldoText = saldoElement.textContent.trim();
            const cleaned = saldoText
                .replace('Rp', '')
                .replace(/\./g, '')
                .replace(',', '.');
                
            return parseFloat(cleaned) || 0;
        } catch (e) {
            console.error('Error reading saldo value:', e);
            return 0;
        }
    };

    // Fungsi untuk mendapatkan waktu trading saat ini
    const getCurrentTradingTime = () => {
        try {
            const clockElement = document.querySelector('p.clock.ng-star-inserted');
            if (!clockElement) return null;
            
            const clockText = clockElement.textContent.trim();
            const timeMatch = clockText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
            if (!timeMatch) return null;
            
            return {
                minutes: parseInt(timeMatch[2]),
                seconds: parseInt(timeMatch[3])
            };
        } catch (e) {
            console.error('Error reading trading time:', e);
            return null;
        }
    };

    const checkTargetProfit = () => {
        if (targetProfit > 0 && totalProfit >= targetProfit) {
            Log.add("🎯 TARGET PROFIT TERCAPAI! 🎯 Total Profit: " + formatter.format(totalProfit), true);
            isRunning = false;
            actionLock = false;
            isWaiting = false;
            updatePanel();
            return true;
        }
        return false;
    };

    const performTrade = async () => {
        if (!isRunning || actionLock) return;
        
        if (checkTargetProfit()) {
            Log.add("Trading dihentikan karena target profit tercapai", true);
            return;
        }
        
        actionLock = true;
        isWaiting = true;
        tradeProcessed = false;
        updatePanel();
        
        // Gunakan stake normal dari daftar
        const stake = stakeList[currentIndex];
        lastStake = stake;
        totalModal += stake;
        sessionModal += stake;
        updatePanel();
        
        const success = await setStake(stake);
        if (!success) {
            actionLock = false;
            isWaiting = false;
            return Log.add("GAGAL SET STAKE", false);
        }

        await delay(100);
        lastSaldoValue = getSaldoValue();
        
        clickTrade(nextAction);
        Log.add("TRADE " + nextAction.toUpperCase() + " " + formatter.format(stake), true);
        
        // Mulai observer jam (tanpa log)
        startClockObserver();
    };

    // Sistem deteksi berdasarkan waktu (detik 01 saja)
    const startClockObserver = () => {
        if (clockObserver) {
            clockObserver.disconnect();
            clockObserver = null;
        }
        
        const clockElement = document.querySelector('p.clock.ng-star-inserted');
        if (!clockElement) {
            Log.add("Elemen jam tidak ditemukan", false);
            return;
        }
        
        clockObserver = new MutationObserver(() => {
            if (!isWaiting || tradeProcessed) return;
            
            const currentTime = getCurrentTradingTime();
            if (!currentTime || currentTime.seconds !== 1) return; // Detik 01
            
            // Tidak ada log waktu trading selesai
            checkTradeResult();
        });
        
        clockObserver.observe(clockElement, {
            characterData: true,
            childList: true,
            subtree: true
        });
        
        // Tidak ada log clock observer aktif
    };

    // Fungsi untuk mengecek hasil trade di detik 01
    const checkTradeResult = () => {
        if (tradeProcessed || !isWaiting) return;
        
        const currentSaldo = getSaldoValue();
        const saldoDifference = currentSaldo - lastSaldoValue;
        
        if (saldoDifference > 1) {
            Log.add("WIN: Saldo bertambah +" + formatter.format(saldoDifference), true);
            processTradeResult('win', saldoDifference);
        } else {
            Log.add("LOSE: Saldo tidak berubah", false);
            processTradeResult('lose');
        }
    };

    // Proses hasil trade dengan reset martingale ke 1 jika mencapai level 11
    const processTradeResult = (result, profitAmount = 0) => {
        if (!isRunning || !isWaiting) return;
        tradeProcessed = true;
        
        // Hentikan observer
        if (clockObserver) {
            clockObserver.disconnect();
            clockObserver = null;
        }
        
        if (result === 'win') {
            totalProfit += profitAmount;
            sessionModal = 0;
            Log.add(`WIN +${formatter.format(profitAmount)} | Total Profit: ${formatter.format(totalProfit)}`, true);
            currentIndex = 0; // Reset ke martingale awal
        } else {
            const lossAmount = lastStake;
            totalProfit -= lossAmount;
            Log.add("LOSE -" + formatter.format(lossAmount), false);
            
            // Reset ke martingale 1 jika mencapai level 11 (indeks 10)
            if (currentIndex === stakeList.length - 1) {
                currentIndex = 0;
                Log.add("RESET MARTINGALE ke level 1", false);
            } else {
                currentIndex = Math.min(currentIndex + 1, stakeList.length - 1);
            }
        }
        
        nextAction = nextAction === 'buy' ? 'sell' : 'buy';
        updatePanel();
        
        if (checkTargetProfit()) {
            return;
        }

        // Reset untuk trade berikutnya
        setTimeout(() => {
            isWaiting = false;
            actionLock = false;
            
            if (isRunning && !checkTargetProfit()) {
                performTrade();
            }
        }, 1000);
    };

    // Update panel UI
    const updatePanel = () => {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        const currentSaldo = getSaldoValue();

        mainPanel.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">' +
                '<div style="font-size: 20px; cursor: move; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ' + 
                (isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)') + ';">' +
                (isRunning ? "⏹️" : "▶️") +
                '</div>' +
                '<div style="font-size: 12px; font-weight: bold; margin-left: 5px;">Mochi Scalper✨</div>' +
                '<div style="font-size: 9px; opacity: 0.7; margin-left: auto;">' + timeString + '</div>' +
            '</div>' +
            
            // Baris baru untuk menampilkan saldo di bawah title
            '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; margin-bottom: 8px; text-align: center; font-size: 10px;">' +
                '<div>Saldo: ' + formatter.format(currentSaldo) + '</div>' +
            '</div>' +
            
            '<div style="margin-bottom: 10px;">' +
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">' +
                    '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">' +
                        '<div style="font-size: 9px; opacity: 0.8;">Profit</div>' +
                        '<div style="color: ' + (totalProfit >= 0 ? 'lime' : 'red') + '; font-weight: bold; font-size: 11px;">' + formatter.format(totalProfit) + '</div>' +
                    '</div>' +
                    
                    '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">' +
                        '<div style="font-size: 9px; opacity: 0.8;">Modal Sesi</div>' +
                        '<div style="font-weight: bold; font-size: 11px;">' + formatter.format(sessionModal) + '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">' +
                    '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">' +
                        '<div style="font-size: 9px; opacity: 0.8;">Total Modal</div>' +
                        '<div style="font-weight: bold; font-size: 11px;">' + formatter.format(totalModal) + '</div>' +
                    '</div>' +
                    
                    '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">' +
                        '<div style="font-size: 9px; opacity: 0.8;">Stake</div>' +
                        '<div style="font-weight: bold; font-size: 11px;">' + formatter.format(stakeList[currentIndex]) + '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">' +
                    '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                        '<span>Target Profit:</span>' +
                        '<div style="display: flex; align-items: center;">' +
                            '<input id="targetProfitInput" type="number" min="0" step="1000" value="' + targetProfit + '" style="width: 80px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px; text-align: right; margin-right: 5px;">' +
                            '<span>IDR</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px;">' +
                    '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                        '<span>Martingale:</span>' +
                        '<span>' + (currentIndex + 1) + '/' + stakeList.length + '</span>' +
                    '</div>' +
                    '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                        '<span>Next Action:</span>' +
                        '<span style="color: ' + (nextAction === 'buy' ? '#00ff9d' : '#ff4d6d') + '">' +
                            nextAction.toUpperCase() +
                        '</span>' +
                    '</div>' +
                    '<div style="display: flex; justify-content: space-between;">' +
                        '<span>Status:</span>' +
                        '<span style="color: ' + (isWaiting ? 'yellow' : isRunning ? 'lime' : 'red') + '">' +
                            (isWaiting ? 'WAITING' : isRunning ? 'RUNNING' : 'STOPPED') +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            // Panel aktivitas yang diperlebar
            '<div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; max-height: 180px; min-height: 120px; overflow-y: auto; font-size: 10px;">' +
                '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2);">' +
                    '<span style="font-weight: bold;">Aktivitas</span>' +
                    '<span style="font-size: 9px; opacity: 0.7;">' + formatter.format(stakeList[currentIndex]) + '</span>' +
                '</div>' +
                '<div id="logContainer"></div>' +
            '</div>';

        Log.init();
        
        const targetInput = document.getElementById('targetProfitInput');
        if (targetInput) {
            targetInput.addEventListener('change', (e) => {
                targetProfit = parseInt(e.target.value) || 0;
                if (targetProfit > 0) {
                    Log.add("Target profit diatur: " + formatter.format(targetProfit), true);
                }
            });
        }
    };

    const mainPanel = document.createElement("div");
    mainPanel.style.cssText = 'position: fixed;' +
        'top: 100px;' +
        'left: 20px;' +
        'z-index: 999999;' +
        'background: rgba(0, 30, 15, 0.92);' +
        'color: white;' +
        'padding: 12px;' +
        'border-radius: 10px;' +
        'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;' +
        'font-size: 11px;' +
        'width: 240px;' +
        'max-height: 380px;' +
        'backdrop-filter: blur(8px);' +
        'box-shadow: 0 0 10px 2px rgba(0, 255, 0, 0.5);' +
        'border: 1px solid rgba(0, 255, 150, 0.5);' +
        'display: flex;' +
        'flex-direction: column;' +
        'overflow: hidden;' +
        'user-select: none;';
    document.body.appendChild(mainPanel);

    let offsetX, offsetY, isDragging = false;

    const startDrag = (e) => {
        isDragging = true;
        offsetX = e.clientX - mainPanel.offsetLeft;
        offsetY = e.clientY - mainPanel.offsetTop;
        mainPanel.style.cursor = 'grabbing';
        mainPanel.style.boxShadow = '0 0 15px 3px rgba(0, 255, 0, 0.8)';
    };

    const dragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        mainPanel.style.left = (e.clientX - offsetX) + 'px';
        mainPanel.style.top = (e.clientY - offsetY) + 'px';
    };

    const endDrag = () => {
        isDragging = false;
        mainPanel.style.cursor = '';
        mainPanel.style.boxShadow = '0 0 10px 2px rgba(0, 255, 0, 0.5)';
    };

    mainPanel.addEventListener("mousedown", (e) => {
        if (e.target.closest('#logContainer')) return;
        startDrag(e);
    });

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", endDrag);

    mainPanel.addEventListener("touchstart", (e) => {
        if (e.target.closest('#logContainer')) return;
        const touch = e.touches[0];
        isDragging = true;
        offsetX = touch.clientX - mainPanel.offsetLeft;
        offsetY = touch.clientY - mainPanel.offsetTop;
        mainPanel.style.boxShadow = '0 0 15px 3px rgba(0, 255, 0, 0.8)';
    });

    document.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        mainPanel.style.left = (touch.clientX - offsetX) + 'px';
        mainPanel.style.top = (touch.clientY - offsetY) + 'px';
    });

    document.addEventListener("touchend", endDrag);

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
            sessionModal = 0;
            lastSaldoValue = getSaldoValue();
            updatePanel();
            Log.add("BOT DIMULAI. Saldo: " + formatter.format(lastSaldoValue), true);
            
            // Mulai trading langsung tanpa pengecekan waktu
            performTrade();
        } else {
            Log.add("BOT DIHENTIKAN", false);
            updatePanel();
        }
    });

    updatePanel();
    Log.add("Bot siap digunakan", true);
    Log.add("Klik ▶️ untuk memulai", true);
    Log.add("Set target profit di panel", true);
    Log.add("Deteksi waktu: detik 01", true);
    Log.add("Martingale reset ke 1 jika kalah di level 11", true);
})();
