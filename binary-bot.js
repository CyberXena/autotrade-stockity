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
    let accountType = 'real'; // 'real' or 'demo'

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
            logEntry.style.cssText = 'padding: 8px 10px;' +
                'border-radius: 4px;' +
                'margin-bottom: 6px;' +
                'background: rgba(0,0,0,0.2);' +
                'display: flex;' +
                'align-items: center;' +
                'font-size: 12px;' +
                'pointer-events: auto;'; // Pastikan bisa diinteraksi
            
            logEntry.innerHTML = '<div style="width: 20px; height: 20px; border-radius: 50%; background: ' + 
                (isWin ? 'rgba(0,255,100,0.2)' : 'rgba(255,80,80,0.2)') + 
                '; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px;">' +
                (isWin ? '✓' : '✗') +
                '</div>' +
                '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: ' + (isWin ? '#00ff9d' : '#ff6b8b') + '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">' + message + '</div>' +
                '<div style="font-size: 10px; opacity: 0.7; margin-top: 3px;">' + timeString + '</div>' +
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
    const switchAccount = () => {
        accountType = accountType === 'real' ? 'demo' : 'real';
        updatePanel();
        
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
            <!-- Header Panel -->
            <div style="position: fixed; top: 0; left: 0; width: 100%; background: linear-gradient(90deg, #002b15 0%, #001a0d 100%); padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 999999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); pointer-events: auto;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 18px; font-weight: bold; background: linear-gradient(45deg, #00ff9d, #00b8ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 10px rgba(0,255,157,0.3);">
                        Mochi Scalper✨
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div id="account-toggle" style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); border-radius: 20px; padding: 5px; cursor: pointer;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${accountType === 'real' ? '#007bff' : '#00c853'}; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: transform 0.3s ease;">
                            ${accountType === 'real' ? 'R' : 'D'}
                        </div>
                        <div style="font-size: 12px; padding-right: 5px;">
                            ${accountType === 'real' ? 'Akun Riil' : 'Akun Demo'}
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; opacity: 0.8; background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 20px;">
                        ${timeString}
                    </div>
                </div>
            </div>

            <!-- Panel Utama (60%) -->
            <div style="position: fixed; top: 60px; left: 0; width: 100%; height: 60vh; background: rgba(0, 40, 20, 0.95); padding: 20px; z-index: 999998; box-shadow: 0 10px 20px rgba(0,0,0,0.4); border-radius: 0 0 20px 20px; overflow-y: auto; pointer-events: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%;">
                    <!-- Kolom Kiri: Kontrol dan Statistik -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- Toggle Bot -->
                        <div style="display: flex; justify-content: center;">
                            <div id="toggle-bot" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)'}; font-size: 28px; cursor: pointer; box-shadow: 0 0 15px ${isRunning ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.5)'}; transition: all 0.3s ease;">
                                ${isRunning ? "⏹️" : "▶️"}
                            </div>
                        </div>

                        <!-- Saldo -->
                        <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 15px; text-align: center; font-size: 18px; border: 1px solid rgba(0,255,157,0.2);">
                            <div id="saldo-display" style="font-weight: bold; color: #00ff9d;">${formatter.format(currentSaldo)}</div>
                            <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">SALDO</div>
                        </div>

                        <!-- Statistik -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(0,150,255,0.2);">
                                <div style="color: ${totalProfit >= 0 ? '#00ff9d' : '#ff6b8b'}; font-weight: bold; font-size: 16px;">${formatter.format(totalProfit)}</div>
                                <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">PROFIT</div>
                            </div>
                            <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,193,7,0.2);">
                                <div style="font-weight: bold; font-size: 16px;">${formatter.format(sessionModal)}</div>
                                <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">MODAL SESI</div>
                            </div>
                            <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(156,39,176,0.2);">
                                <div style="font-weight: bold; font-size: 16px;">${formatter.format(totalModal)}</div>
                                <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">TOTAL MODAL</div>
                            </div>
                            <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(33,150,243,0.2);">
                                <div style="font-weight: bold; font-size: 16px;">${formatter.format(stakeList[currentIndex])}</div>
                                <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">STAKE</div>
                            </div>
                        </div>

                        <!-- Target Profit -->
                        <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,152,0,0.2);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-size: 14px;">🎯 Target Profit:</div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input id="targetProfitInput" type="number" min="0" step="1000" value="${targetProfit}" style="width: 120px; padding: 8px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,152,0,0.5); border-radius: 8px; text-align: right; font-size: 14px;">
                                    <div style="font-size: 12px; opacity: 0.8;">IDR</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Kolom Kanan: Status Trading -->
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- Status Trading -->
                        <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 15px; border: 1px solid rgba(233,30,99,0.2); height: 100%;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                                <div>Martingale:</div>
                                <div style="text-align: right; font-weight: bold;">${currentIndex + 1}/${stakeList.length}</div>
                                
                                <div>Next Action:</div>
                                <div style="color: ${nextAction === 'buy' ? '#00ff9d' : '#ff6b8b'}; text-align: right; font-weight: bold;">${nextAction.toUpperCase()}</div>
                                
                                <div>Status:</div>
                                <div style="color: ${isWaiting ? '#ffeb3b' : isRunning ? '#00ff9d' : '#ff6b8b'}; text-align: right; font-weight: bold;">
                                    ${isWaiting ? 'MENUNGGU' : isRunning ? 'BERJALAN' : 'BERHENTI'}
                                </div>
                            </div>
                        </div>

                        <!-- Informasi Tambahan -->
                        <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 15px; border: 1px solid rgba(0,150,255,0.2);">
                            <div style="font-size: 12px; text-align: center; margin-bottom: 8px; opacity: 0.8;">STRATEGI</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                                <div>Mode:</div>
                                <div style="text-align: right; font-weight: bold;">Martingale 11 Level</div>
                                
                                <div>Reset:</div>
                                <div style="text-align: right; font-weight: bold;">Kalah di Level 11</div>
                                
                                <div>Deteksi:</div>
                                <div style="text-align: right; font-weight: bold;">Toast Win/Lose</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Panel Log Aktivitas (10%) -->
            <div style="position: fixed; top: calc(60px + 60vh); left: 0; width: 100%; height: 10vh; background: rgba(0, 30, 15, 0.95); padding: 10px 20px; z-index: 999998; box-shadow: 0 -5px 15px rgba(0,0,0,0.3); border-radius: 20px 20px 0 0; pointer-events: auto;">
                <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #00ff9d;"></div>
                    <div>AKTIVITAS TRADING</div>
                </div>
                <div id="logContainer" style="height: calc(10vh - 40px); overflow-y: auto; padding-right: 5px;"></div>
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
        document.getElementById('account-toggle').addEventListener('click', switchAccount);
    };

    const mainPanel = document.createElement("div");
    mainPanel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999997;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
        user-select: none;
        pointer-events: none; /* Nonaktifkan interaksi di seluruh panel */
    `;
    document.body.appendChild(mainPanel);

    // Inisialisasi interval pembaruan saldo
    saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
    
    updatePanel();
    Log.add("Bot siap digunakan", true);
    Log.add("Klik ▶️ untuk memulai trading", true);
    Log.add("Set target profit di panel", true);
    Log.add("Deteksi: Toast Win/Lose", true);
    Log.add("Martingale reset ke level 1 jika kalah di level 11", true);
    Log.add("Fitur switch akun aktif (klik tombol akun)", true);
})();
