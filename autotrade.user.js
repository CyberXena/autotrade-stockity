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
    
    console.log('[AutoTrade] Memulai inisialisasi...');
    
    // Konfigurasi repo GitHub
    const GITHUB_USER = 'CyberXena';
    const REPO_NAME = 'autotrade-stockity';
    const BRANCH = 'main';
    const SCRIPT_FILE = 'binary-bot.js';
    
    const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/${BRANCH}/${SCRIPT_FILE}`;
    
    // Fungsi untuk memuat script utama
    const loadTradingScript = () => {
        console.log('[AutoTrade] Memuat script trading dari GitHub...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_RAW_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // Tambahkan penanda sebelum eksekusi
                        const loader = document.createElement('div');
                        loader.id = 'autotrade-loader';
                        loader.style = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            background: #3498db;
                            color: white;
                            text-align: center;
                            padding: 5px;
                            z-index: 10000;
                            font-family: Arial;
                        `;
                        loader.textContent = 'AutoTrade PRO: Memuat strategi trading...';
                        document.body.prepend(loader);
                        
                        // Eksekusi kode trading
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        document.head.appendChild(script);
                        
                        // Hapus loader setelah 3 detik
                        setTimeout(() => {
                            if (document.getElementById('autotrade-loader')) {
                                document.getElementById('autotrade-loader').remove();
                            }
                        }, 3000);
                        
                        console.log('[AutoTrade] Script trading berhasil dieksekusi!');
                        updateStatus('Strategi aktif', '#2ecc71');
                    } catch (e) {
                        console.error('[AutoTrade] Kesalahan eksekusi:', e);
                        updateStatus('Error eksekusi', '#e74c3c');
                    }
                } else {
                    console.error(`[AutoTrade] Gagal memuat. Status: ${response.status}`);
                    updateStatus('Gagal memuat script', '#e74c3c');
                }
            },
            onerror: function(error) {
                console.error('[AutoTrade] Kesalahan jaringan:', error);
                updateStatus('Error jaringan', '#e74c3c');
            }
        });
    };
    // Banner status (DIPERBAIKI)
    const initBanner = () => {
        const existingBanner = document.getElementById('autotrade-banner');
        if (existingBanner) existingBanner.remove();
        
        const banner = document.createElement('div');
        banner.id = 'autotrade-banner';
        banner.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-left: 4px solid #3498db;
            min-width: 200px;
        `;
        banner.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="background: #3498db; width: 10px; height: 10px; border-radius: 50%; margin-right: 10px;"></div>
                <strong>AutoTrade PRO v1.1</strong>
            </div>
            <div>Status: <span id="autotrade-status" style="font-weight: bold;">Loading...</span></div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">GitHub: ${GITHUB_USER}/${REPO_NAME}</div>
        `;
        document.body.appendChild(banner);
        
        return (text, color = 'white') => {
            const statusEl = document.getElementById('autotrade-status');
            if (statusEl) {
                statusEl.textContent = text;
                statusEl.style.color = color;
            }
        };
    };
    
    const updateStatus = initBanner();
    updateStatus('Menginisialisasi', '#f1c40f');

    // Start script ketika halaman siap (DIPERBAIKI)
    if (document.readyState === 'complete') {
        setTimeout(checkPageReady, 2000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(checkPageReady, 2000);
        });
    }

    // Fallback jika event load tidak terpicu
    setTimeout(checkPageReady, 5000);
})();
