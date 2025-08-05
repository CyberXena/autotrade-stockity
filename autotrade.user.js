// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.2
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
        const maxAttempts = 10; // Diperpendek dari 15
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
                setTimeout(check, 1000); // Dipercepat dari 2 detik
            }
        };

        check();
    };

    // Banner status (LENGKAP)
    const initBanner = () => {
        // Buat elemen banner
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.padding = '10px';
        banner.style.textAlign = 'center';
        banner.style.backgroundColor = '#3498db';
        banner.style.color = 'white';
        banner.style.zIndex = '10000';
        banner.style.fontFamily = 'Arial, sans-serif';
        banner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        banner.textContent = 'AutoTrade Stockity Pro: Menginisialisasi...';

        // Tambahkan ke body
        document.body.appendChild(banner);

        // Fungsi untuk mengupdate banner
        const updateStatus = (text, color) => {
            banner.textContent = `AutoTrade Stockity Pro: ${text}`;
            banner.style.backgroundColor = color;
        };

        return updateStatus;
    };

    // Main
    const main = () => {
        const updateStatus = initBanner();
        updateStatus('Menginisialisasi...', '#f1c40f');

        // Cek ketersediaan GM_xmlhttpRequest
        if (typeof GM_xmlhttpRequest === 'undefined') {
            updateStatus('Error: GM_xmlhttpRequest tidak tersedia', '#e74c3c');
            return;
        }

        // Step 1: Tunggu halaman siap
        updateStatus('Menunggu halaman siap...', '#f1c40f');
        checkPageReady((isReady) => {
            if (!isReady) {
                updateStatus('Memuat tanpa konfirmasi grafik...', '#e67e22');
            } else {
                updateStatus('Halaman siap!', '#2ecc71');
            }

            // Step 2: Ambil script dari GitHub
            updateStatus('Memuat strategi...', '#3498db');
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_RAW_URL + '?t=' + Date.now(),
                onload: function(response) {
                    if (response.status === 200) {
                        // Step 3: Jalankan script
                        const success = loadTradingScript(response.responseText);
                        if (success) {
                            updateStatus('Strategi aktif!', '#2ecc71');
                            // Sembunyikan banner setelah 3 detik
                            setTimeout(() => {
                                banner.style.display = 'none';
                            }, 3000);
                        } else {
                            updateStatus('Error eksekusi strategi', '#e74c3c');
                        }
                    } else {
                        updateStatus(`Gagal memuat: ${response.status}`, '#e74c3c');
                    }
                },
                onerror: function() {
                    updateStatus('Error jaringan', '#e74c3c');
                }
            });
        });
    };

    // Tunggu sampai dokumen siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        setTimeout(main, 500); // Dipercepat
    }
})();
