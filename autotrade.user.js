// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.6
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
            // Buat script element
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
            // Cek multiple elements untuk reliabilitas
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

    // Toast notifikasi animasi dengan roket dan progress bar
    const initToastManager = () => {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'autotrade-toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '10000';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);

        // Style untuk animasi dan progress bar
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes floatRocket {
                0% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-3px) rotate(-5deg); }
                50% { transform: translateY(0) rotate(0deg); }
                75% { transform: translateY(-3px) rotate(5deg); }
                100% { transform: translateY(0) rotate(0deg); }
            }
            @keyframes rocketLaunch {
                0% { transform: translateX(0) translateY(0); opacity: 1; }
                70% { transform: translateX(-200px) translateY(-100px); opacity: 0.8; }
                100% { transform: translateX(-250px) translateY(-150px); opacity: 0; }
            }
            .autotrade-toast {
                animation: slideIn 0.5s forwards;
            }
            .rocket-icon {
                animation: floatRocket 2s infinite;
                font-size: 24px;
                display: inline-block;
            }
            .progress-container {
                width: 100%;
                height: 8px;
                background-color: rgba(255,255,255,0.2);
                border-radius: 4px;
                margin-top: 10px;
                overflow: hidden;
                position: relative;
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                border-radius: 4px;
                width: 0%;
                transition: width 0.5s ease;
            }
            .progress-text {
                text-align: center;
                font-size: 12px;
                margin-top: 5px;
                font-weight: bold;
                color: white;
            }
        `;
        document.head.appendChild(style);

        // Fungsi untuk menampilkan toast dengan progress bar dan roket
        const showProgressToast = (message, progress) => {
            // Cek apakah toast sudah ada
            let toast = document.getElementById('autotrade-progress-toast');
            
            if (!toast) {
                // Buat toast baru jika belum ada
                toast = document.createElement('div');
                toast.id = 'autotrade-progress-toast';
                toast.className = 'autotrade-toast';
                toast.style.minWidth = '300px';
                toast.style.padding = '15px 20px';
                toast.style.borderRadius = '8px';
                toast.style.backgroundColor = '#2c3e50';
                toast.style.color = 'white';
                toast.style.fontFamily = 'Arial, sans-serif';
                toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                toast.style.display = 'flex';
                toast.style.flexDirection = 'column';
                toast.style.transform = 'translateY(-20px)';
                toast.style.opacity = '0';
                toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

                // Konten toast
                toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="rocket-icon">🚀</span>
                        <span style="flex: 1;">${message}</span>
                    </div>
                    <div class="progress-container">
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
                // Update toast yang sudah ada
                const messageEl = toast.querySelector('span:nth-child(2)');
                const progressBar = toast.querySelector('.progress-bar');
                const progressText = toast.querySelector('.progress-text');
                
                if (messageEl) messageEl.textContent = message;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}%`;
            }

            return toast;
        };

        // Fungsi untuk animasi peluncuran roket
        const launchRocketAnimation = (toast, callback) => {
            const rocket = toast.querySelector('.rocket-icon');
            if (!rocket) return;

            // Simpan pesan asli
            const originalMessage = toast.querySelector('span:nth-child(2)').textContent;
            
            // Update pesan
            toast.querySelector('span:nth-child(2)').textContent = 'Meluncurkan strategi...';
            
            // Animasi peluncuran roket
            rocket.style.animation = 'rocketLaunch 1.5s forwards';
            
            setTimeout(() => {
                if (callback) callback();
            }, 1500);
        };

        // Fungsi untuk menampilkan toast biasa
        const showToast = (message, color, icon = 'ℹ️', duration = 3000) => {
            const toast = document.createElement('div');
            toast.className = 'autotrade-toast';
            toast.style.minWidth = '300px';
            toast.style.padding = '15px 20px';
            toast.style.borderRadius = '8px';
            toast.style.backgroundColor = color;
            toast.style.color = 'white';
            toast.style.fontFamily = 'Arial, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '12px';
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

            // Ikon toast
            const iconEl = document.createElement('span');
            iconEl.textContent = icon;
            iconEl.style.fontSize = '20px';

            // Pesan toast
            const messageEl = document.createElement('span');
            messageEl.textContent = message;
            messageEl.style.flex = '1';

            toast.appendChild(iconEl);
            toast.appendChild(messageEl);
            toastContainer.appendChild(toast);

            // Animasi masuk
            setTimeout(() => {
                toast.style.transform = 'translateY(0)';
                toast.style.opacity = '1';
            }, 10);

            // Animasi keluar otomatis
            if (duration > 0) {
                setTimeout(() => {
                    toast.style.transform = 'translateX(100%)';
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
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

        // Cek ketersediaan GM_xmlhttpRequest
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showToast('Error: GM_xmlhttpRequest tidak tersedia', '#e74c3c', '❌', 5000);
            return;
        }

        // Update progress secara bertahap
        const updateProgress = (message, progress) => {
            if (progressToast) {
                progressToast = showProgressToast(message, progress);
            }
        };

        // Step 1: Tunggu halaman siap
        updateProgress('Memeriksa kesiapan halaman...', 20);
        
        checkPageReady((isReady) => {
            if (!isReady) {
                updateProgress('Memuat tanpa konfirmasi grafik...', 40);
            } else {
                updateProgress('Halaman siap!', 40);
            }

            // Step 2: Ambil script dari GitHub
            updateProgress('Memuat strategi dari GitHub...', 60);
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_RAW_URL + '?t=' + Date.now(),
                onload: function(response) {
                    if (response.status === 200) {
                        updateProgress('Strategi berhasil dimuat!', 80);
                        
                        // Animasi roket dan progress 100%
                        setTimeout(() => {
                            updateProgress('Mengeksekusi strategi...', 100);
                            
                            // Animasi roket meluncur
                            launchRocketAnimation(progressToast, () => {
                                // Step 3: Jalankan script setelah animasi selesai
                                const success = loadTradingScript(response.responseText);
                                
                                // Hapus toast progress
                                if (progressToast) {
                                    progressToast.style.transform = 'translateX(100%)';
                                    progressToast.style.opacity = '0';
                                    setTimeout(() => {
                                        if (progressToast && progressToast.parentNode) {
                                            progressToast.parentNode.removeChild(progressToast);
                                        }
                                    }, 300);
                                }
                                
                                // Tampilkan hasil eksekusi
                                if (success) {
                                    console.log('[AutoTrade] Script berhasil diinject');
                                    showToast('Strategi aktif! Trading otomatis berjalan', '#2ecc71', '🤖', 3000);
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

    // Tunggu sampai dokumen siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        setTimeout(main, 500);
    }
})();
