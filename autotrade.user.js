// ==UserScript==
// @name         AutoTrade Stockity Pro
// @namespace    https://github.com/CyberXena
// @version      1.0.12
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

    // Main process tanpa notifikasi dan pengecekan halaman
    const main = () => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_RAW_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    loadTradingScript(response.responseText);
                    console.log('[AutoTrade] Script trading berhasil diinjeksi');
                } else {
                    console.error('[AutoTrade] Gagal memuat script:', response.status);
                }
            },
            onerror: function(error) {
                console.error('[AutoTrade] Error jaringan:', error);
            }
        });
    };

    // Jalankan saat dokumen siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        setTimeout(main, 1000);
    }
})();
