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

    const delay = ms => new Promise(res => setTimeout(res, ms));

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
            return;
        }

        await delay(100);
        lastSaldoValue = getSaldoValue();
        
        clickTrade(nextAction);
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
                            processTradeResult('win', saldoDifference);
                        }, 100);
                    } else if (isLose) {
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
            currentIndex = 0;
        } else {
            const lossAmount = lastStake;
            totalProfit -= lossAmount;
            
            if (currentIndex === stakeList.length - 1) {
                currentIndex = 0;
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
                
                // Cari dan klik tombol "Berdagang" setelah switch
                setTimeout(() => clickTradeButton(), 500);
                
                // Perbarui saldo
                setTimeout(() => {
                    lastSaldoValue = getSaldoValue();
                    updatePanel();
                }, 1000);
            }
        }, 300);
    };

    // Fungsi untuk mencari dan mengklik tombol "Berdagang" spesifik
    const clickTradeButton = () => {
        // Cari tombol dengan ID spesifik
        const tradeButton = document.querySelector('vui-button[id="qa_account_changed_trading_button"] button.button_btn__dCMn2');
        
        if (tradeButton) {
            tradeButton.click();
        } else {
            // Fallback: Cari berdasarkan teks jika tidak ditemukan dengan ID
            const buttons = document.querySelectorAll('button.button_btn__dCMn2');
            
            for (const button of buttons) {
                const span = button.querySelector('span.button_text-wrapper__3nklk');
                if (span && span.textContent.trim() === 'Berdagang') {
                    button.click();
                    break;
                }
            }
        }
    };

    // Update panel UI
    const updatePanel = () => {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        const currentSaldo = getSaldoValue();

        mainPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                <div style="font-size: 16px; font-weight: bold; cursor: move; display: flex; align-items: center; gap: 8px;">
                    <div style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${isRunning ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,0,0.3)'};">
                        ${isRunning ? "⏹️" : "▶️"}
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
                        <div style="color: ${totalProfit >= 0 ? 'lime' : 'red'}; font-weight: bold; font-size: 11px;">${formatter.format(totalProfit)}</div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Modal Sesi</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(sessionModal)}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Total Modal</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(totalModal)}</div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 6px; text-align: center;">
                        <div style="font-size: 9px; opacity: 0.8;">Stake</div>
                        <div style="font-weight: bold; font-size: 11px;">${formatter.format(stakeList[currentIndex])}</div>
                    </div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Target Profit:</span>
                        <div style="display: flex; align-items: center;">
                            <input id="targetProfitInput" type="number" min="0" step="1000" value="${targetProfit}" style="width: 80px; padding: 2px 4px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 3px; text-align: right; margin-right: 5px;">
                            <span>IDR</span>
                        </div>
                    </div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
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
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 8px; font-size: 10px; margin-bottom: 8px;">
                    <div style="font-size: 10px; margin-bottom: 5px; text-align: center;">Switch Akun</div>
                    <div style="display: flex; gap: 5px;">
                        <button id="switchToReal" style="flex:1; padding: 5px; background: ${accountType === 'real' ? '#007bff' : 'rgba(0,100,200,0.5)'}; color: white; border: none; border-radius: 3px;">Riil</button>
                        <button id="switchToDemo" style="flex:1; padding: 5px; background: ${accountType === 'demo' ? '#00c853' : 'rgba(0,200,100,0.5)'}; color: white; border: none; border-radius: 3px;">Demo</button>
                    </div>
                </div>
            </div>
        `;

        // Event listener untuk toggle bot
        const toggleBot = mainPanel.querySelector('div[style*="width: 30px;"]');
        if (toggleBot) {
            toggleBot.addEventListener('click', () => {
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
                    
                    initToastObserver();
                    performTrade();
                } else {
                    updatePanel();
                }
            });
        }
        
        // Event listener untuk target profit
        const targetInput = document.getElementById('targetProfitInput');
        if (targetInput) {
            targetInput.addEventListener('change', (e) => {
                targetProfit = parseInt(e.target.value) || 0;
            });
        }
        
        // Event listener untuk tombol switch akun
        document.getElementById('switchToReal')?.addEventListener('click', () => {
            accountType = 'real';
            switchAccount();
        });
        
        document.getElementById('switchToDemo')?.addEventListener('click', () => {
            accountType = 'demo';
            switchAccount();
        });
    };

    // Buat panel utama
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
        'backdrop-filter: blur(8px);' +
        'box-shadow: 0 0 10px 2px rgba(0, 255, 0, 0.5);' +
        'border: 1px solid rgba(0, 255, 150, 0.5);' +
        'display: flex;' +
        'flex-direction: column;' +
        'overflow: hidden;' +
        'user-select: none;';
    document.body.appendChild(mainPanel);

    // Fungsi drag panel
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

    // Header sebagai area drag
    const header = mainPanel.querySelector('div[style*="cursor: move;"]');
    if (header) {
        header.addEventListener("mousedown", startDrag);
    }

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", endDrag);

    // Support untuk touch devices
    header?.addEventListener("touchstart", (e) => {
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

    // Inisialisasi interval pembaruan saldo
    saldoUpdateInterval = setInterval(updateSaldoDisplay, 1000);
    
    updatePanel();
})();
