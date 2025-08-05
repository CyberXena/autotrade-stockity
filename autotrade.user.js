// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.4
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

    // Toast notifikasi animasi
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
            toast.style.animation = 'slideIn 0.5s ease-out, float 3s ease-in-out infinite';
            toast.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';

            // Ikon toast
            const iconEl = document.createElement('span');
            iconEl.textContent = icon;
            iconEl.style.fontSize = '20px';
            iconEl.style.animation = 'pulse 2s infinite';

            // Pesan toast
            const messageEl = document.createElement('span');
            messageEl.textContent = message;
            messageEl.style.flex = '1';

            // Tombol close
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'white';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.fontSize = '24px';
            closeBtn.onclick = () => {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            };

            toast.appendChild(iconEl);
            toast.appendChild(messageEl);
            toast.appendChild(closeBtn);
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
                    setTimeout(() => toast.remove(), 500);
                }, duration);
            }

            return toast;
        };

        // Tambahkan style animasi
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes float {
                0% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
                100% { transform: translateY(0); }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            .autotrade-toast {
                animation: slideIn 0.5s forwards, float 3s infinite;
            }
        `;
        document.head.appendChild(style);

        return showToast;
    };

    // Main
    const main = () => {
        const showToast = initToastManager();
        let statusToast = showToast('Menginisialisasi AutoTrade...', '#3498db', '🚀', 0);

        // Cek ketersediaan GM_xmlhttpRequest
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showToast('Error: GM_xmlhttpRequest tidak tersedia', '#e74c3c', '❌', 5000);
            return;
        }

        // Step 1: Tunggu halaman siap
        const updateToast = (text, color, icon) => {
            if (statusToast) {
                statusToast.querySelector('span:nth-child(2)').textContent = text;
                statusToast.style.backgroundColor = color;
                statusToast.querySelector('span:first-child').textContent = icon;
            } else {
                statusToast = showToast(text, color, icon, 0);
            }
        };

        updateToast('Menunggu halaman siap...', '#f1c40f', '⏳');
        
        checkPageReady((isReady) => {
            if (!isReady) {
                updateToast('Memuat tanpa konfirmasi grafik...', '#e67e22', '⚠️');
            } else {
                updateToast('Halaman siap!', '#2ecc71', '✅');
            }

            // Step 2: Ambil script dari GitHub
            updateToast('Memuat strategi dari GitHub...', '#3498db', '📡');
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_RAW_URL + '?t=' + Date.now(),
                onload: function(response) {
                    if (response.status === 200) {
                        // Step 3: Jalankan script
                        const success = loadTradingScript(response.responseText);
                        if (success) {
                            updateToast('Strategi aktif! Trading otomatis berjalan', '#2ecc71', '🤖');
                            
                            // Animasi keluar toast status
                            setTimeout(() => {
                                statusToast.style.transform = 'translateX(100%)';
                                statusToast.style.opacity = '0';
                                setTimeout(() => statusToast.remove(), 500);
                            }, 3000);
                            
                            // Notifikasi sukses kecil
                            setTimeout(() => {
                                showToast('AutoTrade aktif', '#27ae60', '✅', 2000);
                            }, 3500);
                        } else {
                            showToast('Error eksekusi strategi', '#e74c3c', '❌', 5000);
                        }
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
