// Log.js
window.Log = (function() {
    let container = null;
    function init() {
        container = document.getElementById('logContainer');
        if (!container) {
            console.warn('Log container not found!');
        }
    }

    function add(message, isWin) {
        if (!container) return;
        
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 8);
        
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            padding: 3px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            font-size: 10px;
        `;
        
        logEntry.innerHTML = `
            <div style="width: 16px; height: 16px; border-radius: 50%; background: ${isWin ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)'}; display: flex; align-items: center; justify-content: center; margin-right: 6px; font-size: 10px;">
                ${isWin ? '✓' : '✗'}
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="color: ${isWin ? 'lime' : '#ff4d6d'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message}</div>
                <div style="font-size: 8px; opacity: 0.7;">${timeString}</div>
            </div>
        `;
        
        container.appendChild(logEntry);
        container.scrollTop = container.scrollHeight;
    }

    function clear() {
        if (container) {
            container.innerHTML = '';
        }
    }

    return {
        init,
        add,
        clear
    };
})();
