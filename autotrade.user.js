// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.8
// @description  Auto trading script untuk Stockity.id - Terhubung ke GitHub
// @author       CyberXena
// @match        https://stockity.id/trading
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/CyberXena/autotrade-stockity/main/autotrade.user.js
// @downloadURL  https://raw.githubusercontent.com/CyberXena/autotrade-stockity/main/autotrade.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Konfigurasi repo GitHub
    const GITHUB_USER = 'CyberXena';
    const REPO_NAME = 'autotrade-stockity';
    const BRANCH = 'main';
    const SCRIPT_FILE = 'binary-bot.js';
    const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/${BRANCH}/${SCRIPT_FILE}`;

    // Fungsi untuk memuat script utama dengan isolasi
    const loadTradingScript = (code) => {
        try {
            const script = document.createElement('script');
            script.textContent = `(function() { ${code} })();`;
            document.head.appendChild(script);
            return true;
        } catch (e) {
            console.error('[AutoTrade] Error eksekusi script utama:', e);
            return false;
        }
    };

    // Fungsi untuk memeriksa kondisi halaman
    const checkPageReady = (callback) => {
        const maxAttempts = 10;
        let attempts = 0;

        const check = () => {
            attempts++;
            const isReady = document.querySelector('.chart-container') !== null 
                || document.querySelector('.trading-view') !== null;

            if (isReady) {
                callback(true);
            } else if (attempts >= maxAttempts) {
                callback(false);
            } else {
                setTimeout(check, 1000);
            }
        };

        check();
    };

    // Toast notifikasi animasi dengan roket dan progress bar, posisinya di tengah layar
    const initToastManager = () => {
        // Container toast di tengah layar
        const toastContainer = document.createElement('div');
        toastContainer.id = 'autotrade-toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '50%';
        toastContainer.style.left = '50%';
        toastContainer.style.transform = 'translate(-50%, -50%)';
        toastContainer.style.zIndex = '10000';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.alignItems = 'center';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);

        // Style untuk animasi dan progress bar
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateY(40px) scale(0.97); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes floatRocket {
                0% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-3px) rotate(-5deg); }
                50% { transform: translateY(0) rotate(0deg); }
                75% { transform: translateY(-3px) rotate(5deg); }
                100% { transform: translateY(0) rotate(0deg); }
            }
            @keyframes rocketLaunch {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                70% { transform: translateY(-120px) scale(1.1); opacity: 0.8; }
                100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
            }
            .autotrade-toast {
                animation: slideIn 0.5s forwards cubic-bezier(.28,.84,.42,1);
            }
            .rocket-icon {
                animation: floatRocket 2s infinite;
                font-size: 32px;
                display: inline-block;
            }
            .progress-container {
                width: 270px;
                height: 10px;
                background-color: rgba(255,255,255,0.14);
                border-radius: 5px;
                margin-top: 18px;
                overflow: hidden;
                position: relative;
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                border-radius: 4px;
                width: 0%;
                transition: width 0.4s cubic-bezier(.28,.84,.42,1);
            }
            .progress-text {
                text-align: center;
                font-size: 13px;
                margin-top: 10px;
                font-weight: bold;
                color: #fff;
                letter-spacing: 0.5px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.12);
            }
            .autotrade-toast-success {
                background: #2ecc71 !important;
            }
            .autotrade-toast-error {
                background: #e74c3c !important;
            }
        `;
        document.head.appendChild(style);

        // Fungsi untuk menampilkan toast loading di tengah
        const showProgressToast = (message, progress) => {
            let toast = document.getElementById('autotrade-progress-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'autotrade-progress-toast';
                toast.className = 'autotrade-toast';
                toast.style.minWidth = '320px';
                toast.style.maxWidth = '95vw';
                toast.style.padding = '26px 32px 20px 32px';
                toast.style.borderRadius = '14px';
                toast.style.backgroundColor = '#2c3e50';
                toast.style.color = 'white';
                toast.style.fontFamily = 'Arial, sans-serif';
                toast.style.boxShadow = '0 8px 32px 0 rgba(44,62,80,0.14)';
                toast.style.display = 'flex';
                toast.style.flexDirection = 'column';
                toast.style.alignItems = 'center';
                toast.style.transform = 'translateY(40px)';
                toast.style.opacity = '0';
                toast.style.transition = 'transform 0.3s, opacity 0.3s';

                toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span class="rocket-icon">🚀</span>
                        <span class="autotrade-toast-message" style="font-size: 18px;line-height:1.4;flex:1;">${message}</span>
                    </div>
                    <div class="progress-container" style="margin-top: 14px;">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="progress-text">${progress}%</div>
                `;

                toastContainer.appendChild(toast);

                // Animasi masuk
                setTimeout(() => {
                    toast.style.transform = 'translateY(0)';
                    toast.style.opacity = '1';
                }, 10);
            } else {
                const messageEl = toast.querySelector('.autotrade-toast-message');
                const progressBar = toast.querySelector('.progress-bar');
                const progressText = toast.querySelector('.progress-text');
                if (messageEl) messageEl.textContent = message;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}%`;
            }
            // Always update bar width
            const progressBar = toast.querySelector('.progress-bar');
            if (progressBar) progressBar.style.width = `${progress}%`;
            return toast;
        };

        // Fungsi animasi peluncuran roket
        const launchRocketAnimation = (toast, callback) => {
            const rocket = toast.querySelector('.rocket-icon');
            if (!rocket) return;
            const messageEl = toast.querySelector('.autotrade-toast-message');
            if (messageEl) messageEl.textContent = 'Meluncurkan strategi...';
            rocket.style.animation = 'rocketLaunch 1.5s forwards';
            setTimeout(() => {
                if (callback) callback();
            }, 1500);
        };

        // Fungsi untuk menampilkan toast biasa (sukses/gagal) – tetap di tengah
        const showToast = (message, color, icon = 'ℹ️', duration = 3000) => {
            const toast = document.createElement('div');
            toast.className = 'autotrade-toast';
            toast.style.minWidth = '320px';
            toast.style.maxWidth = '95vw';
            toast.style.padding = '22px 30px';
            toast.style.borderRadius = '13px';
            toast.style.backgroundColor = color;
            toast.style.color = 'white';
            toast.style.fontFamily = 'Arial, sans-serif';
            toast.style.boxShadow = '0 8px 32px 0 rgba(44,62,80,0.14)';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '15px';
            toast.style.transform = 'translateY(40px)';
            toast.style.opacity = '0';
            toast.style.fontSize = '17px';
            toast.style.transition = 'transform 0.3s, opacity 0.3s';

            const iconEl = document.createElement('span');
            iconEl.textContent = icon;
            iconEl.style.fontSize = '26px';

            const messageEl = document.createElement('span');
            messageEl.textContent = message;
            messageEl.style.flex = '1';

            toast.appendChild(iconEl);
            toast.appendChild(messageEl);
            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.transform = 'translateY(0)';
                toast.style.opacity = '1';
            }, 10);

            if (duration > 0) {
                setTimeout(() => {
                    toast.style.transform = 'translateY(40px)';
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 330);
                }, duration);
            }
            return toast;
        };

        return {
            showProgressToast,
            showToast,
            launchRocketAnimation
        };
    };

    // Main
    const main = () => {
        const toastManager = initToastManager();
        const showProgressToast = toastManager.showProgressToast;
        const showToast = toastManager.showToast;
        const launchRocketAnimation = toastManager.launchRocketAnimation;

        let progressToast = showProgressToast('Menginisialisasi AutoTrade...', 0);

        if (typeof GM_xmlhttpRequest === 'undefined') {
            showToast('Error: GM_xmlhttpRequest tidak tersedia', '#e74c3c', '❌', 5000);
            return;
        }

        const updateProgress = (message, progress) => {
            if (progressToast) {
                progressToast = showProgressToast(message, progress);
            }
        };

        updateProgress('Memeriksa kesiapan halaman...', 20);

        checkPageReady((isReady) => {
            if (!isReady) {
                updateProgress('Memuat tanpa konfirmasi grafik...', 40);
            } else {
                updateProgress('Halaman siap!', 40);
            }

            updateProgress('Memuat strategi dari GitHub...', 60);
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_RAW_URL + '?t=' + Date.now(),
                onload: function(response) {
                    if (response.status === 200) {
                        updateProgress('Strategi berhasil dimuat!', 80);

                        setTimeout(() => {
                            updateProgress('Mengeksekusi strategi...', 100);

                            launchRocketAnimation(progressToast, () => {
                                const success = loadTradingScript(response.responseText);

                                if (progressToast) {
                                    progressToast.style.transform = 'translateY(40px)';
                                    progressToast.style.opacity = '0';
                                    setTimeout(() => {
                                        if (progressToast && progressToast.parentNode) {
                                            progressToast.parentNode.removeChild(progressToast);
                                        }
                                    }, 320);
                                }

                                if (success) {
                                    console.log('[AutoTrade] Script berhasil diinject');
                                    showToast('Strategi aktif! Trading otomatis berjalan', '#2ecc71', '🤖', 3200);
                                } else {
                                    console.error('[AutoTrade] Gagal inject script');
                                    showToast('Error eksekusi strategi', '#e74c3c', '❌', 5000);
                                }
                            });
                        }, 800);
                    } else {
                        showToast(`Gagal memuat: ${response.status}`, '#e74c3c', '❌', 5000);
                    }
                },
                onerror: function() {
                    showToast('Error jaringan', '#e74c3c', '❌', 5000);
                }
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        setTimeout(main, 500);
    }
})();
