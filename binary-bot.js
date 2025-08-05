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
    let toastObserver = null;
    let saldoUpdateInterval = null;

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
            
            // Menghapus fungsi pencegahan keyboard muncul
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
    };

    // Sistem deteksi berdasarkan toast (popup)
    const initToastObserver = () => {
        if (toastObserver) {
            toastObserver.disconnect();
            toastObserver = null;
        }
        
        toastObserver = new MutationObserver(mutations => {
            if (!isRunning || !isWaiting || tradeProcessed) return;

            for (const mutation of mutations) {
                const added = [...mutation.addedNodes];
                const toast = added.find(node => 
                    node.nodeType === 1 && 
                    node.querySelector?.('lottie-player')
                );

                if (toast) {
                    const lottie = toast.querySelector('lottie-player');
                    if (!lottie) continue;
                    
                    // Deteksi semua kemungkinan win (win1 hingga win100) dan lose
                    const isWin = /win\d*/i.test(lottie.className);
                    const isLose = /lose/i.test(lottie.className);
                    
                    if (isWin) {
                        setTimeout(() => {
                            if (tradeProcessed) return;
                            const currentSaldo = getSaldoValue();
                            const saldoDifference = currentSaldo - lastSaldoValue;
                            Log.add("WIN: Saldo bertambah +" + formatter.format(saldoDifference), true);
                            processTradeResult('win', saldoDifference);
                        }, 100);
                    } else if (isLose) {
                        Log.add("LOSE: Toast terdeteksi", false);
                        processTradeResult('lose');
                    }
                    break;
                }
            }
        });

        toastObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    // Proses hasil trade
    const processTradeResult = (result, profitAmount = 0) => {
        if (!isRunning || !isWaiting) return;
        tradeProcessed = true;
        
        if (result === 'win') {
            totalProfit += profitAmount;
            sessionModal = 0;
            Log.add(`WIN +${formatter.format(profitAmount)} | Total Profit: ${formatter.format(totalProfit)}`, true);
            currentIndex = 0;
        } else {
            const lossAmount = lastStake;
            totalProfit -= lossAmount;
            Log.add("LOSE -" + formatter.format(lossAmount), false);
            
            if (currentIndex === stakeList.length - 1) {
                currentIndex = 0;
                Log.add("RESET MARTINGALE ke level 1", false);
            } else {
                currentIndex = Math.min(currentIndex + 1, stakeList.length - 1);
            }
        }
        
        nextAction = nextAction === 'buy' ? 'sell' : 'buy';
        updatePanel();
        
        if (checkTargetProfit()) return;

        setTimeout(() => {
            isWaiting = false;
            actionLock = false;
            
            if (isRunning && !checkTargetProfit()) {
                performTrade();
            }
        }, 1000);
    };

    // Fungsi untuk memperbarui saldo secara real-time
    const updateSaldoDisplay = () => {
        const saldoElement = document.getElementById('saldo-display');
        if (saldoElement) {
            saldoElement.textContent = 'Saldo: ' + formatter.format(getSaldoValue());
        }
    };

    // Fungsi untuk switch akun
    const switchAccount = (accountType) => {
        // Buka dropdown akun
        const accountBtn = document.getElementById('account-btn');
        if (accountBtn) accountBtn.click();

        setTimeout(() => {
            // Temukan radio button berdasarkan jenis akun
            const accountValue = accountType === 'demo' ? '-1' : '-2';
            const radioBtn = document.querySelector(`input[type="radio"][value="${accountValue}"]`);
            
            if (radioBtn) {
                radioBtn.click();
                Log.add(`Berhasil beralih ke akun ${accountType === 'demo' ? 'Demo' : 'Riil'}`, true);
                
                // Cari dan klik tombol "Berdagang" setelah switch
                setTimeout(() => clickTradeButton(), 500);
                
                // Perbarui saldo
                setTimeout(() => {
                    lastSaldoValue = getSaldoValue();
                    updatePanel();
                }, 1000);
            } else {
                Log.add(`Gagal menemukan opsi akun ${accountType}`, false);
            }
        }, 300);
    };

    // Fungsi untuk mencari dan mengklik tombol "Berdagang" spesifik
    const clickTradeButton = () => {
        // Cari tombol dengan ID spesifik
        const tradeButton = document.querySelector('vui-button[id="qa_account_changed_trading_button"] button.button_btn__dCMn2');
        
        if (tradeButton) {
            tradeButton.click();
            Log.add('Tombol "Berdagang" berhasil diklik', true);
        } else {
            // Fallback: Cari berdasarkan teks jika tidak ditemukan dengan ID
            const buttons = document.querySelectorAll('button.button_btn__dCMn2');
            let found = false;
            
            for (const button of buttons) {
                const span = button.querySelector('span.button_text-wrapper__3nklk');
                if (span && span.textContent.trim() === 'Berdagang') {
                    button.click();
                    Log.add('Tombol "Berdagang" ditemukan melalui teks', true);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                Log.add('Tombol "Berdagang" tidak ditemukan', false);
            }
        }
    };

    // Update panel UI
    const updatePanel = () => {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        const currentSaldo = getSaldoValue();

        mainPanel.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; background: rgba(0, 30, 15, 0.95); padding: 10px; display: flex; justify-content: space-between; align-items: center; z-index: 999999; border-bottom: 1px solid rgba(255,255,255,0.2);">
                <div style="display: flex; gap: 10px;">
                    <button id="switchToReal" style="padding: 8px 16px; background: rgba(0,100,200,0.5); color: white; border: none; border-radius: 4px; cursor: pointer;">Riil</button>
                    <button id="switchToDemo" style="padding: 8px 16px; background: rgba(0,200,100,0.5); color: white; border: none; border-radius: 4px; cursor: pointer;">Demo</button>
                </div>
                <div style="font-size: 14px; opacity: 0.8;">${timeString}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; padding-top: 60px; height: calc(100vh - 60px); overflow-y: auto;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                        <div id="toggle-bot" style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)'}; font-size: 24px; cursor: pointer;">
                            ${isRunning ? "⏹️" : "▶️"}
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; text-align: center; font-size: 16px;">
                        <div id="saldo-display">Saldo: ${formatter.format(currentSaldo)}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                            <div style="font-size: 12px; opacity: 0.8;">Profit</div>
                            <div style="color: ${totalProfit >= 0 ? 'lime' : 'red'}; font-weight: bold; font-size: 14px;">${formatter.format(totalProfit)}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                            <div style="font-size: 12px; opacity: 0.8;">Modal Sesi</div>
                            <div style="font-weight: bold; font-size: 14px;">${formatter.format(sessionModal)}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                            <div style="font-size: 12px; opacity: 0.8;">Total Modal</div>
                            <div style="font-weight: bold; font-size: 14px;">${formatter.format(totalModal)}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                            <div style="font-size: 12px; opacity: 0.8;">Stake</div>
                            <div style="font-weight: bold; font-size: 14px;">${formatter.format(stakeList[currentIndex])}</div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span>Target Profit:</span>
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <input id="targetProfitInput" type="number" min="0" step="1000" value="${targetProfit}" style="width: 100px; padding: 5px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 4px; text-align: right;">
                                <span>IDR</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 5px;">
                            <div>Martingale:</div>
                            <div style="text-align: right;">${currentIndex + 1}/${stakeList.length}</div>
                            <div>Next Action:</div>
                            <div style="color: ${nextAction === 'buy' ? '#00ff9d' : '#ff4d6d'}; text-align: right; font-weight: bold;">${nextAction.toUpperCase()}</div>
                            <div>Status:</div>
                            <div style="color: ${isWaiting ? 'yellow' : isRunning ? 'lime' : 'red'}; text-align: right; font-weight: bold;">
                                ${isWaiting ? 'WAITING' : isRunning ? 'RUNNING' : 'STOPPED'}
                            </div>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 10px; display: flex; flex-direction: column; height: 100%;">
                    <div style="font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">Aktivitas</div>
                    <div id="logContainer" style="flex: 1; overflow-y: auto;"></div>
                </div>
            </div>
        `;

        Log.init();
        
        // Event listener untuk toggle bot
        document.getElementById('toggle-bot').addEventListener('click', () => {
            isRunning = !isRunning;
            
            if (isRunning) {
                // Mulai interval pembaruan saldo
                if (!saldoUpdateInterval) {
                    saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
                }
                
                currentIndex = 0;
                nextAction = "buy";
                actionLock = false;
                isWaiting = true;
                totalModal = 0;
                sessionModal = 0;
                lastSaldoValue = getSaldoValue();
                updatePanel();
                Log.add("BOT DIMULAI. Saldo: " + formatter.format(lastSaldoValue), true);
                
                initToastObserver();
                performTrade();
            } else {
                Log.add("BOT DIHENTIKAN", false);
                updatePanel();
            }
        });
        
        // Event listener untuk target profit
        const targetInput = document.getElementById('targetProfitInput');
        if (targetInput) {
            targetInput.addEventListener('change', (e) => {
                targetProfit = parseInt(e.target.value) || 0;
                if (targetProfit > 0) {
                    Log.add("Target profit diatur: " + formatter.format(targetProfit), true);
                }
            });
        }
        
        // Event listener untuk tombol switch akun
        document.getElementById('switchToReal')?.addEventListener('click', () => switchAccount('real'));
        document.getElementById('switchToDemo')?.addEventListener('click', () => switchAccount('demo'));
    };

    const mainPanel = document.createElement("div");
    mainPanel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999998;
        background: rgba(0, 30, 15, 0.92);
        color: white;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
        user-select: none;
    `;
    document.body.appendChild(mainPanel);

    // Inisialisasi interval pembaruan saldo
    saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
    
    updatePanel();
    Log.add("Bot siap digunakan", true);
    Log.add("Klik ▶️ untuk memulai", true);
    Log.add("Set target profit di panel", true);
    Log.add("Deteksi: Toast Win/Lose", true);
    Log.add("Martingale reset ke 1 jika kalah di level 11", true);
    Log.add("Fitur switch akun aktif", true);
})();
