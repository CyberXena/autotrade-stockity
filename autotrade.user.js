// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.0
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
                        // Eksekusi kode trading
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        document.head.appendChild(script);
                        console.log('[AutoTrade] Script trading berhasil dieksekusi!');
                    } catch (e) {
                        console.error('[AutoTrade] Kesalahan eksekusi:', e);
                    }
                } else {
                    console.error(`[AutoTrade] Gagal memuat. Status: ${response.status}`);
                    console.log('[AutoTrade] Response:', response.responseText.slice(0, 100) + '...');
                }
            },
            onerror: function(error) {
                console.error('[AutoTrade] Kesalahan jaringan:', error);
            },
            ontimeout: function() {
                console.error('[AutoTrade] Timeout saat memuat script');
            }
        });
    };

    // Fungsi untuk memeriksa kondisi halaman
    const checkPageReady = () => {
        const checkInterval = setInterval(() => {
            // Cek elemen spesifik di halaman trading
            const chartElement = document.querySelector('.tv-chart');
            const balanceElement = document.querySelector('.balance');
            
            if (chartElement && balanceElement) {
                clearInterval(checkInterval);
                console.log('[AutoTrade] Halaman siap!');
                loadTradingScript();
            } else {
                console.log('[AutoTrade] Menunggu elemen trading...');
            }
        }, 2000);
    };

    // Start script ketika halaman siap
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(checkPageReady, 1000);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(checkPageReady, 1000);
        });
    }
    
    // Tampilkan banner status di halaman
    const initBanner = () => {
        const banner = document.createElement('div');
        banner.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        `;
        banner.innerHTML = `
            <strong>AutoTrade PRO</strong> 
            <div>Status: <span id="autotrade-status">Loading...</span></div>
        `;
        document.body.appendChild(banner);
        
        // Update status
        const updateStatus = (text, color = 'white') => {
            const statusEl = document.getElementById('autotrade-status');
            if (statusEl) {
                statusEl.textContent = text;
                statusEl.style.color = color;
            }
        };
        
        return updateStatus;
    };
    
    const updateStatus = initBanner();
    updateStatus('Script dijalankan', '#f1c40f');
})();
