(function() {
    'use strict';

    var currentSettings = null;

    function sendToActiveTab(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }

    function updateUI() {
        chrome.runtime.sendMessage({ action: 'get-settings' }, function(response) {
            if (response && response.success && response.settings) {
                currentSettings = response.settings;
                renderState();
            }
        });
    }

    function renderState() {
        if (!currentSettings) return;

        var dot = document.getElementById('status-dot');
        var text = document.getElementById('status-text');
        var eqToggle = document.getElementById('eq-toggle');
        var effectsToggle = document.getElementById('effects-toggle');

        if (currentSettings.pluginDisabled) {
            if (dot) dot.className = 'status-dot off';
            if (text) text.textContent = '插件已禁用';
            if (eqToggle) eqToggle.classList.remove('active');
            if (effectsToggle) effectsToggle.classList.remove('active');
        } else if (currentSettings.enabled) {
            if (dot) dot.className = 'status-dot on';
            if (text) text.textContent = 'EQ运行中';
            if (eqToggle) eqToggle.classList.add('active');
        } else {
            if (dot) dot.className = 'status-dot off';
            if (text) text.textContent = 'EQ已关闭';
            if (eqToggle) eqToggle.classList.remove('active');
        }

        if (currentSettings.effectsEnabled && !currentSettings.pluginDisabled) {
            if (effectsToggle) effectsToggle.classList.add('active');
        } else {
            if (effectsToggle) effectsToggle.classList.remove('active');
        }

        renderPresets();
    }

    function renderPresets() {
        var container = document.getElementById('presets-container');
        if (!container) return;
        container.innerHTML = '';

        Object.keys(EQ_PRESETS).forEach(function(key) {
            var btn = document.createElement('button');
            btn.className = 'preset-btn' + (currentSettings && currentSettings.preset === key ? ' active' : '');
            btn.textContent = EQ_PRESETS[key].name;
            btn.addEventListener('click', function() {
                chrome.runtime.sendMessage({ action: 'apply-preset', preset: key }, function() {
                    updateUI();
                });
            });
            container.appendChild(btn);
        });
    }

    document.getElementById('eq-toggle').addEventListener('click', function() {
        if (!currentSettings) return;
        var newState = !currentSettings.enabled;
        chrome.runtime.sendMessage({ action: 'toggle-eq', enabled: newState }, function() {
            updateUI();
        });
    });

    document.getElementById('effects-toggle').addEventListener('click', function() {
        if (!currentSettings) return;
        var newState = !currentSettings.effectsEnabled;
        chrome.runtime.sendMessage({ action: 'toggle-effects', enabled: newState }, function() {
            updateUI();
        });
    });

    document.getElementById('open-panel-btn').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'open-panel' });
            }
        });
    });

    function showConfirmDialog(message, callback) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#2d2d3f;border-radius:12px;padding:20px;width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.5);text-align:center;';
        box.innerHTML = '<div style="color:#e0e0e0;font-size:13px;margin-bottom:16px;line-height:1.5;">' + message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button id="popup-confirm-cancel" style="padding:6px 18px;border:none;border-radius:6px;background:#444;color:#ccc;cursor:pointer;font-size:12px;">取消</button>' +
            '<button id="popup-confirm-ok" style="padding:6px 18px;border:none;border-radius:6px;background:#ff4757;color:#fff;cursor:pointer;font-size:12px;">确定</button>' +
            '</div>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        var closed = false;
        function close(val) { if (closed) return; closed = true; overlay.remove(); callback(val); }
        document.getElementById('popup-confirm-cancel').addEventListener('click', function() { close(false); });
        document.getElementById('popup-confirm-ok').addEventListener('click', function() { close(true); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(false); });
    }

    document.getElementById('reset-eq-btn').addEventListener('click', function() {
        showConfirmDialog('确定重置EQ设置？', function(ok) {
            if (!ok) return;
            chrome.runtime.sendMessage({ action: 'reset-eq' }, function() {
                updateUI();
            });
        });
    });

    document.getElementById('reset-all-btn').addEventListener('click', function() {
        showConfirmDialog('确定重置所有设置？此操作不可撤销。', function(ok) {
            if (!ok) return;
            chrome.runtime.sendMessage({ action: 'reset-plugin' }, function() {
                updateUI();
            });
        });
    });

    updateUI();
})();
