// ==UserScript==
// @name         AutoTrade Stockity
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto trading script for Stockity.id
// @author       CyberXena
// @match        https://stockity.id/trading
// @grant        none
// @updateURL    https://raw.githubusercontent.com/CyberXena/autotrade-stockity/main/binary-bot.user.js
// @downloadURL  https://raw.githubusercontent.com/CyberXena/autotrade-stockity/main/binary-bot.user.js
// ==/UserScript==

// Kode utama di sini atau memuat kode dari file eksternal
// Karena kita ingin kode di repo terpisah, kita bisa menggunakan pendekatan injeksi script

(function() {
    'use strict';

    // Membuat elemen script untuk memuat kode dari GitHub
    const script = document.createElement('script');
    script.src = 'https://raw.githubusercontent.com/CyberXena/autotrade-stockity/main/binary-bot.js';
    script.type = 'text/javascript';
    document.head.appendChild(script);
})();
