(function() {
    'use strict';

    if (window.__MOEKOE_EQ_CONTENT__) return;
    window.__MOEKOE_EQ_CONTENT__ = true;

    if (typeof EQ_FREQUENCIES === 'undefined') {
        window.EQ_FREQUENCIES = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
        window.EQ_PRESETS = { flat:{name:'平坦',gains:Array(31).fill(0)} };
        window.AUDIO_EFFECTS_DEFAULT = {bassBoost:0,dynamicBass:0,warmth:0,vocalEnhance:0,presence:0,clarity:0,trebleBoost:0,dynamicEnhance:0,ambiance:0,surround:0,reverb:0,outputGain:50,stereoBalance:50,loudnessCompensation:0,harmonicExciter:0,crossfeed:0,subHarmonic:0,tubeSaturation:0,multibandComp:0,deEsser:0,stereoWidener:0,tapeEmulation:0,loudnessMaximizer:0};
        window.DYNAMIC_EQ_DEFAULT = {enabled:false,threshold:-30,ratio:6,attack:0.02,release:0.15};
        window.DEFAULT_SETTINGS = {enabled:true,gains:Array(31).fill(0),qValues:Array(31).fill(1.4),preset:'flat',pluginDisabled:false,effects:null,effectsEnabled:true,channelMode:'stereo',leftGains:Array(31).fill(0),rightGains:Array(31).fill(0),leftQValues:Array(31).fill(1.4),rightQValues:Array(31).fill(1.4),dynamicEQ:null,midSideEnabled:false,midGains:Array(31).fill(0),sideGains:Array(31).fill(0),linearPhaseEnabled:false,referenceProfile:null};
        window.MSG_SRC = {CONTENT:'__moekoe_eq_content__',MAIN:'__moekoe_eq_main__',BACKGROUND:'__moekoe_eq_background__',POPUP:'__moekoe_eq_popup__'};
        window.Q_VALUE_MIN = 0.1; window.Q_VALUE_MAX = 18.0; window.Q_VALUE_DEFAULT = 1.4; window.Q_VALUE_STEP = 0.1;
        window.GAIN_MIN = -6; window.GAIN_MAX = 6; window.GAIN_STEP = 0.5;
        window.CHANNEL_MODES = ['stereo','left','right','independent'];
        console.warn('[MoeKoeEQ-CONTENT] constants.js not loaded, using inline fallback');
    }

    var panel = null;
    var fabButton = null;
    var isPanelOpen = false;
    var channelEditTarget = 'left';
    var shadowHost = null;
    var shadowRoot = null;

    function getShadowRoot() {
        return shadowRoot;
    }

    function $id(id) {
        return shadowRoot ? shadowRoot.querySelector('#' + id) : null;
    }

    function $qs(sel) {
        return shadowRoot ? shadowRoot.querySelector(sel) : null;
    }

    function $qsa(sel) {
        return shadowRoot ? shadowRoot.querySelectorAll(sel) : [];
    }

    function ensureShadowHost() {
        if (shadowHost && shadowRoot) return;
        if (!document.body) {
            setTimeout(ensureShadowHost, 50);
            return;
        }
        shadowHost = document.createElement('div');
        shadowHost.id = 'moekoe-eq-host';
        shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483640;';
        document.body.appendChild(shadowHost);
        shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    var isFabVisible = false;
    var currentTab = 'eq';
    var currentSettings = null;
    var customPresets = [];
    var spectrumCanvas = null;
    var spectrumCtx = null;
    var spectrumAnimId = null;
    var isSpectrumActive = false;
    var debounceTimers = {};
    var toastTimeout = null;

    function debounce(key, fn, delay) {
        if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
        debounceTimers[key] = setTimeout(function() {
            fn();
            delete debounceTimers[key];
        }, delay);
    }

    function showPresetNameDialog(callback) {
        ensureShadowHost();
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#2d2d3f;border-radius:12px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        box.innerHTML = '<div style="color:#fff;font-size:16px;margin-bottom:16px;">保存预设</div>' +
            '<input id="moekoe-preset-input" type="text" placeholder="输入预设名称" style="width:100%;padding:10px 12px;border:1px solid #444;border-radius:8px;background:#1a1a2e;color:#fff;font-size:14px;outline:none;box-sizing:border-box;" />' +
            '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
            '<button id="moekoe-preset-cancel" style="padding:8px 20px;border:none;border-radius:8px;background:#444;color:#ccc;cursor:pointer;">取消</button>' +
            '<button id="moekoe-preset-ok" style="padding:8px 20px;border:none;border-radius:8px;background:#6c5ce7;color:#fff;cursor:pointer;">确定</button>' +
            '</div>';
        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);
        var input = $id('moekoe-preset-input');
        input.focus();
        var closed = false;
        function close(val) { if (closed) return; closed = true; if (overlay.parentNode) overlay.remove(); callback(val); }
        $id('moekoe-preset-cancel').addEventListener('click', function() { close(null); });
        $id('moekoe-preset-ok').addEventListener('click', function() { var v = input.value.trim(); close(v || null); });
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { var v = input.value.trim(); close(v || null); } if (e.key === 'Escape') close(null); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(null); });
    }

    function showConfirmDialog(message, callback) {
        ensureShadowHost();
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#2d2d3f;border-radius:12px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        box.innerHTML = '<div style="color:#fff;font-size:14px;margin-bottom:20px;line-height:1.5;">' + escapeHTML(message) + '</div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="moekoe-confirm-cancel" style="padding:8px 20px;border:none;border-radius:8px;background:#444;color:#ccc;cursor:pointer;">取消</button>' +
            '<button id="moekoe-confirm-ok" style="padding:8px 20px;border:none;border-radius:8px;background:#ff4757;color:#fff;cursor:pointer;">确定</button>' +
            '</div>';
        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);
        var closed = false;
        function close(val) { if (closed) return; closed = true; if (overlay.parentNode) overlay.remove(); callback(val); }
        $id('moekoe-confirm-cancel').addEventListener('click', function() { close(false); });
        $id('moekoe-confirm-ok').addEventListener('click', function() { close(true); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(false); });
    }

    function showToast(msg) {
        ensureShadowHost();
        var existing = $id('moekoe-eq-toast');
        if (existing) existing.remove();
        var t = document.createElement('div');
        t.id = 'moekoe-eq-toast';
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:2147483647;pointer-events:none;transition:opacity 0.3s;';
        shadowRoot.appendChild(t);
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function() { if (t.parentNode) t.remove(); }, 2000);
    }

    function isExtensionContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    function safeRuntimeMessage(message, callback) {
        if (!isExtensionContextValid()) {
            if (callback) callback(null);
            return;
        }
        try {
            chrome.runtime.sendMessage(message, function(response) {
                if (chrome.runtime.lastError) {
                    if (callback) callback(null);
                    return;
                }
                if (callback) callback(response);
            });
        } catch (e) {
            if (callback) callback(null);
        }
    }

    function sendToMain(type, data) {
        if (!MSG_SRC) return;
window.postMessage({ source: MSG_SRC.CONTENT, type: type, data: data }, window.location.origin);
    }

    function saveSettingsToStorage(settings) {
        if (!isExtensionContextValid()) return;
        debounce('save-settings', function() {
            safeRuntimeMessage({ action: 'save-settings', settings: settings }, function(r) {
                if (r && !r.success) console.warn('[MoeKoeEQ-CT] Save failed');
            });
        }, 100);
    }

    function loadSettingsFromStorage() {
return new Promise(function(resolve) {
            if (!isExtensionContextValid()) {
                currentSettings = buildDefaultSettingsLocal();
                resolve(currentSettings);
                return;
            }
            var resolved = false;
            var timer = setTimeout(function() {
                if (!resolved) {
                    resolved = true;
                    currentSettings = buildDefaultSettingsLocal();
                    resolve(currentSettings);
                }
            }, 2000);

            safeRuntimeMessage({ action: 'get-settings' }, function(response) {
                clearTimeout(timer);
                if (resolved) return;
                resolved = true;
                if (response && response.success && response.settings) {
                    currentSettings = response.settings;
                    if (response.settings.customPresets) {
                        customPresets = response.settings.customPresets;
                    }
                    resolve(response.settings);
                } else {
                    currentSettings = buildDefaultSettingsLocal();
                    resolve(currentSettings);
                }
            });
        });
    }

    function buildDefaultSettingsLocal() {
        var s = {};
        for (var k in DEFAULT_SETTINGS) {
            if (DEFAULT_SETTINGS[k] === null) {
                if (k === 'effects') s[k] = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
                else if (k === 'dynamicEQ') s[k] = Object.assign({}, DYNAMIC_EQ_DEFAULT);
                else if (k === 'referenceProfile') s[k] = null;
                else s[k] = DEFAULT_SETTINGS[k];
            } else if (Array.isArray(DEFAULT_SETTINGS[k])) {
                s[k] = DEFAULT_SETTINGS[k].slice();
            } else if (typeof DEFAULT_SETTINGS[k] === 'object' && DEFAULT_SETTINGS[k] !== null) {
                s[k] = Object.assign({}, DEFAULT_SETTINGS[k]);
            } else {
                s[k] = DEFAULT_SETTINGS[k];
            }
        }
        return s;
    }

    function loadCustomPresets() {
        safeRuntimeMessage({ action: 'get-custom-presets' }, function(response) {
            if (response && response.success) {
                customPresets = response.presets || [];
            }
        });
    }

    var CSS = `
#moekoe-eq-fab{position:fixed;bottom:125px;right:30px;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);border:none;cursor:pointer;z-index:2147483640;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(108,92,231,0.4);transition:all 0.3s ease;}
#moekoe-eq-fab:hover{transform:scale(1.15);box-shadow:0 4px 12px rgba(108,92,231,0.6);}
#moekoe-eq-fab svg{width:13px;height:13px;fill:#fff;}
#moekoe-eq-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:820px;max-height:90vh;background:rgba(20,20,30,0.97);border-radius:16px;z-index:2147483645;display:none;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e0e0e0;overflow:hidden;border:1px solid rgba(108,92,231,0.3);}
#moekoe-eq-panel.visible{display:flex;}
.eq-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(30,30,45,0.9);border-bottom:1px solid rgba(108,92,231,0.2);}
.eq-header-title{font-size:16px;font-weight:600;color:#a29bfe;}
.eq-header-actions{display:flex;gap:8px;align-items:center;}
.eq-btn{padding:6px 14px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all 0.2s;}
.eq-btn-primary{background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;}
.eq-btn-primary:hover{opacity:0.9;}
.eq-btn-danger{background:rgba(255,71,87,0.2);color:#ff4757;border:1px solid rgba(255,71,87,0.3);}
.eq-btn-danger:hover{background:rgba(255,71,87,0.3);}
.eq-btn-secondary{background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.15);}
.eq-btn-secondary:hover{background:rgba(255,255,255,0.15);}
.eq-btn-sm{padding:4px 10px;font-size:11px;}
.eq-tabs{display:flex;padding:0 20px;background:rgba(25,25,40,0.8);border-bottom:1px solid rgba(108,92,231,0.15);}
.eq-tab{padding:10px 18px;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.5);border-bottom:2px solid transparent;transition:all 0.2s;}
.eq-tab:hover{color:rgba(255,255,255,0.8);}
.eq-tab.active{color:#a29bfe;border-bottom-color:#a29bfe;}
.eq-body{flex:1;overflow-y:auto;padding:16px 20px;scrollbar-width:thin;scrollbar-color:rgba(108,92,231,0.3) transparent;}
.eq-body::-webkit-scrollbar{width:6px;}
.eq-body::-webkit-scrollbar-thumb{background:rgba(108,92,231,0.3);border-radius:3px;}
.eq-section{margin-bottom:16px;}
.eq-section-title{font-size:13px;font-weight:600;color:#a29bfe;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.eq-category-title{font-size:11px;font-weight:600;color:rgba(162,155,254,0.7);margin:12px 0 6px;padding:4px 8px;background:rgba(108,92,231,0.1);border-radius:4px;border-left:3px solid rgba(108,92,231,0.4);}
.eq-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.eq-label{font-size:12px;color:rgba(255,255,255,0.6);min-width:70px;}
.eq-slider-wrap{flex:1;display:flex;align-items:center;gap:8px;}
.eq-slider{-webkit-appearance:none;appearance:none;flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);outline:none;}
.eq-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#a29bfe;cursor:pointer;border:2px solid rgba(255,255,255,0.3);}
.eq-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#a29bfe;cursor:pointer;border:2px solid rgba(255,255,255,0.3);}
.eq-value{font-size:11px;color:rgba(255,255,255,0.5);min-width:35px;text-align:right;}
.eq-toggle{position:relative;width:36px;height:20px;background:rgba(255,255,255,0.15);border-radius:10px;cursor:pointer;transition:all 0.3s;}
.eq-toggle.active{background:#6c5ce7;}
.eq-toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:all 0.3s;}
.eq-toggle.active::after{left:18px;}
.eq-select{background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px 10px;font-size:12px;outline:none;cursor:pointer;}
.eq-select option{background:#1e1e2e;color:#e0e0e0;}
#moekoe-eq-spectrum{width:100%;height:120px;border-radius:8px;background:rgba(0,0,0,0.3);margin-bottom:12px;}
.eq-sliders-grid{display:grid;grid-template-columns:repeat(31,1fr);gap:2px;margin-bottom:8px;}
.eq-band{display:flex;flex-direction:column;align-items:center;gap:2px;}
.eq-band input[type=range]{-webkit-appearance:none;appearance:none;width:18px;height:80px;background:transparent;writing-mode:vertical-lr;direction:rtl;}
.eq-band input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:#a29bfe;cursor:pointer;}
.eq-band input[type=range]::-webkit-slider-runnable-track{width:4px;background:rgba(255,255,255,0.15);border-radius:2px;}
.eq-band-freq{font-size:8px;color:rgba(255,255,255,0.4);transform:rotate(-45deg);white-space:nowrap;}
.eq-band-val{font-size:8px;color:rgba(255,255,255,0.5);}
.eq-band-q{width:28px;background:rgba(255,255,255,0.08);color:#a29bfe;border:1px solid rgba(108,92,231,0.2);border-radius:3px;font-size:9px;text-align:center;padding:1px;}
.eq-preset-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.eq-preset-btn{padding:5px 12px;border:1px solid rgba(108,92,231,0.3);border-radius:6px;background:rgba(108,92,231,0.1);color:#a29bfe;cursor:pointer;font-size:11px;transition:all 0.2s;}
.eq-preset-btn:hover{background:rgba(108,92,231,0.2);}
.eq-preset-btn.active{background:rgba(108,92,231,0.3);border-color:#a29bfe;}
.eq-advanced-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.eq-advanced-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;}
.eq-advanced-card-title{font-size:13px;font-weight:600;color:#a29bfe;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.eq-status{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.5);}
.eq-status-dot{width:8px;height:8px;border-radius:50%;}
.eq-status-dot.on{background:#2ed573;}
.eq-status-dot.off{background:#ff4757;}
.eq-close{width:28px;height:28px;border:none;background:rgba(255,255,255,0.1);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
.eq-close:hover{background:rgba(255,71,87,0.3);color:#ff4757;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeOut{from{opacity:1}to{opacity:0}}
`;

    var cssInjected = false;

    function injectCSS() {
        if (cssInjected) return;
        ensureShadowHost();
        if (!shadowRoot) {
            setTimeout(injectCSS, 50);
            return;
        }
        var style = document.createElement('style');
        style.textContent = CSS;
        shadowRoot.appendChild(style);
        cssInjected = true;
    }

    function createPanel() {
        if (panel) return;
        injectCSS();
        ensureShadowHost();
        if (!shadowRoot) return;

        panel = document.createElement('div');
        panel.id = 'moekoe-eq-panel';
        panel.innerHTML = buildPanelHTML();
        shadowRoot.appendChild(panel);
        bindPanelEvents();
    }

    function buildPanelHTML() {
        return `
<div class="eq-header">
    <span class="eq-header-title">31段均衡器 v2.0</span>
    <div class="eq-header-actions">
        <div class="eq-status"><span class="eq-status-dot" id="eq-status-dot"></span><span id="eq-status-text">等待连接</span></div>
        <button class="eq-btn eq-btn-sm eq-btn-secondary" id="eq-toggle-btn">开关EQ</button>
        <button class="eq-btn eq-btn-sm eq-btn-danger" id="eq-reset-btn">重置</button>
        <button class="eq-close" id="eq-close-btn">✕</button>
    </div>
</div>
<div class="eq-tabs">
    <div class="eq-tab active" data-tab="eq">均衡器</div>
    <div class="eq-tab" data-tab="effects">音效增强</div>
    <div class="eq-tab" data-tab="advanced">高级功能</div>
</div>
<div class="eq-body" id="eq-body">
    <div id="eq-tab-content"></div>
</div>`;
    }

    function renderTabContent() {
        var container = $id('eq-tab-content');
        if (!container) return;
        switch (currentTab) {
            case 'eq': container.innerHTML = renderEQTab(); break;
            case 'effects': container.innerHTML = renderEffectsTab(); break;
            case 'advanced': container.innerHTML = renderAdvancedTab(); break;
        }
        bindTabEvents();
    }

    function renderEQTab() {
        var s = currentSettings || buildDefaultSettingsLocal();
        var gains = s.gains || Array(31).fill(0);
        var qValues = s.qValues || Array(31).fill(Q_VALUE_DEFAULT);
        var isIndependent = s.channelMode === 'independent';
        if (isIndependent) {
            gains = channelEditTarget === 'right' ? (s.rightGains || Array(31).fill(0)) : (s.leftGains || Array(31).fill(0));
            qValues = channelEditTarget === 'right' ? (s.rightQValues || Array(31).fill(Q_VALUE_DEFAULT)) : (s.leftQValues || Array(31).fill(Q_VALUE_DEFAULT));
        }

        var channelIndicator = '';
        if (isIndependent) {
            channelIndicator = '<div style="text-align:center;font-size:12px;color:#a29bfe;margin-bottom:8px;">当前编辑：' + (channelEditTarget === 'right' ? '右声道' : '左声道') + '</div>';
        }

        var presetBtns = '';
        Object.keys(EQ_PRESETS).forEach(function(key) {
            var active = s.preset === key ? ' active' : '';
            presetBtns += '<button class="eq-preset-btn' + active + '" data-preset="' + key + '">' + EQ_PRESETS[key].name + '</button>';
        });

        customPresets.forEach(function(p) {
            var active = s.preset === ('custom_' + p.id) ? ' active' : '';
            presetBtns += '<span class="eq-preset-wrap" style="display:inline-flex;align-items:center;gap:2px;">' +
                '<button class="eq-preset-btn' + active + '" data-preset="custom_' + p.id + '" data-preset-data=\'' + escapeHTML(JSON.stringify(p)) + '\'>' + escapeHTML(p.name) + '</button>' +
                '<button class="eq-preset-delete-btn" data-preset-id="' + p.id + '" title="删除预设" style="width:18px;height:18px;border:none;border-radius:4px;background:rgba(255,71,87,0.15);color:#ff4757;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;">✕</button>' +
                '</span>';
        });

        var bands = '';
        for (var i = 0; i < 31; i++) {
            var freq = EQ_FREQUENCIES[i];
            var label = freq >= 1000 ? (freq / 1000) + 'k' : freq + '';
            bands += '<div class="eq-band">' +
                '<input type="range" min="' + GAIN_MIN + '" max="' + GAIN_MAX + '" step="' + GAIN_STEP + '" value="' + gains[i] + '" data-band="' + i + '" class="eq-gain-slider">' +
                '<span class="eq-band-val">' + gains[i].toFixed(1) + '</span>' +
                '<input type="number" class="eq-band-q" min="' + Q_VALUE_MIN + '" max="' + Q_VALUE_MAX + '" step="' + Q_VALUE_STEP + '" value="' + qValues[i].toFixed(1) + '" data-band="' + i + '" title="Q值">' +
                '<span class="eq-band-freq">' + label + '</span>' +
                '</div>';
        }

        return channelIndicator + '<div class="eq-section">' +
            '<div class="eq-section-title">频谱分析</div>' +
            '<canvas id="moekoe-eq-spectrum"></canvas>' +
            '</div>' +
            '<div class="eq-section">' +
            '<div class="eq-section-title">预设</div>' +
            '<div class="eq-preset-row">' + presetBtns +
            '<button class="eq-preset-btn" id="eq-save-preset-btn" style="border-color:#2ed573;color:#2ed573;">+ 保存预设</button>' +
            '</div></div>' +
            '<div class="eq-section">' +
            '<div class="eq-section-title">均衡器调节 <span style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:400;">双击滑杆归零 | Q值可调</span></div>' +
            '<div class="eq-sliders-grid">' + bands + '</div>' +
            '</div>';
    }

    function renderEffectsTab() {
        var s = currentSettings || buildDefaultSettingsLocal();
        var effects = s.effects || Object.assign({}, AUDIO_EFFECTS_DEFAULT);
        var effectsEnabled = s.effectsEnabled !== false;

        var html = '<div class="eq-section">' +
            '<div class="eq-section-title">音效增强 <div class="eq-toggle' + (effectsEnabled ? ' active' : '') + '" id="eq-effects-toggle"></div></div>';

        var categories = EFFECTS_CATEGORIES || {
            basic: { name: '基础增强', effects: ['bassBoost','dynamicBass','warmth','vocalEnhance','presence','clarity','trebleBoost'] },
            spatial: { name: '空间效果', effects: ['dynamicEnhance','ambiance','surround','reverb','stereoWidener','crossfeed'] },
            professional: { name: '专业处理', effects: ['harmonicExciter','tubeSaturation','subHarmonic','tapeEmulation','deEsser','multibandComp'] },
            master: { name: '母带处理', effects: ['loudnessMaximizer','loudnessCompensation','outputGain','stereoBalance'] }
        };

        var info = EFFECTS_INFO || {};

        Object.keys(categories).forEach(function(catKey) {
            var cat = categories[catKey];
            html += '<div class="eq-category-title">' + cat.name + '</div>';
            cat.effects.forEach(function(effectKey) {
                var def = info[effectKey] || { name: effectKey, max: 100 };
                var val = effects[effectKey] || 0;
                var tooltip = def.desc ? ' title="' + def.desc + '"' : '';
                html += '<div class="eq-row">' +
                    '<span class="eq-label"' + tooltip + ' style="cursor:help;">' + def.name + '</span>' +
                    '<div class="eq-slider-wrap">' +
                    '<input type="range" class="eq-slider" min="0" max="' + def.max + '" value="' + val + '" data-effect="' + effectKey + '"' + tooltip + '>' +
                    '<span class="eq-value">' + val + '</span>' +
                    '</div></div>';
            });
        });

        html += '<div style="margin-top:12px;text-align:right;">' +
            '<button class="eq-btn eq-btn-sm eq-btn-secondary" id="eq-reset-effects-btn">重置音效</button>' +
            '</div></div>';

        return html;
    }

    function renderAdvancedTab() {
        var s = currentSettings || buildDefaultSettingsLocal();
        var dynEQ = s.dynamicEQ || Object.assign({}, DYNAMIC_EQ_DEFAULT);

        return '<div class="eq-advanced-grid">' +
            renderChannelModeCard(s) +
            renderDynamicEQCard(dynEQ) +
            renderMidSideCard(s) +
            renderLinearPhaseCard(s) +
            renderLoudnessCard(s) +
            renderReferenceCard(s) +
            '</div>';
    }

    function renderChannelModeCard(s) {
        var mode = s.channelMode || 'stereo';
        var options = CHANNEL_MODES.map(function(m) {
            var labels = { stereo: '立体声', left: '仅左声道', right: '仅右声道', independent: '独立声道' };
            return '<option value="' + m + '"' + (mode === m ? ' selected' : '') + '>' + labels[m] + '</option>';
        }).join('');

        var channelGains = '';
        if (mode === 'independent') {
            channelGains = '<div style="margin-top:8px;">' +
                '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;">选择在均衡器标签页中编辑的声道</div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button class="eq-btn eq-btn-sm eq-channel-select' + (channelEditTarget === 'left' ? ' eq-btn-primary' : ' eq-btn-secondary') + '" data-channel-target="left">左声道</button>' +
                '<button class="eq-btn eq-btn-sm eq-channel-select' + (channelEditTarget === 'right' ? ' eq-btn-primary' : ' eq-btn-secondary') + '" data-channel-target="right">右声道</button>' +
                '</div></div>';
        }

        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">声道模式</div>' +
            '<div class="eq-row"><span class="eq-label">模式</span><select class="eq-select" id="eq-channel-mode">' + options + '</select></div>' +
            channelGains +
            '</div>';
    }

    function renderDynamicEQCard(dynEQ) {
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">动态EQ <div class="eq-toggle' + (dynEQ.enabled ? ' active' : '') + '" id="eq-dynamic-eq-toggle"></div></div>' +
            '<div class="eq-row"><span class="eq-label">阈值</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-60" max="0" value="' + dynEQ.threshold + '" data-dyneq="threshold"><span class="eq-value">' + dynEQ.threshold + 'dB</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">比率</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="1" max="20" step="0.5" value="' + dynEQ.ratio + '" data-dyneq="ratio"><span class="eq-value">' + dynEQ.ratio + '</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">启动</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0.001" max="0.1" step="0.001" value="' + dynEQ.attack + '" data-dyneq="attack"><span class="eq-value">' + dynEQ.attack + 's</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">释放</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0.01" max="1" step="0.01" value="' + dynEQ.release + '" data-dyneq="release"><span class="eq-value">' + dynEQ.release + 's</span></div></div>' +
            '</div>';
    }

    function renderMidSideCard(s) {
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">Mid/Side处理 <div class="eq-toggle' + (s.midSideEnabled ? ' active' : '') + '" id="eq-mid-side-toggle"></div></div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">独立调节中间声道（人声）和侧边声道（宽度）</div>' +
            '<div class="eq-row"><span class="eq-label">Mid增益</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-6" max="6" step="0.5" value="0" data-ms="mid-boost"><span class="eq-value">0dB</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">Side增益</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-6" max="6" step="0.5" value="0" data-ms="side-boost"><span class="eq-value">0dB</span></div></div>' +
            '</div>';
    }

    function renderLinearPhaseCard(s) {
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">线性相位 <div class="eq-toggle' + (s.linearPhaseEnabled ? ' active' : '') + '" id="eq-linear-phase-toggle"></div></div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);">使用FIR滤波器实现零相位偏移，延迟略高但音质更纯净</div>' +
            '</div>';
    }

    function renderLoudnessCard(s) {
        var val = (s.effects && s.effects.loudnessCompensation) || 0;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">响度补偿 (Fletcher-Munson)</div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">低音量时自动提升低频和高频，补偿人耳感知衰减</div>' +
            '<div class="eq-row"><span class="eq-label">补偿量</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0" max="100" value="' + val + '" data-effect="loudnessCompensation"><span class="eq-value">' + val + '</span></div></div>' +
            '</div>';
    }

    function renderReferenceCard(s) {
        var hasRef = s.referenceProfile !== null;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">参考曲目匹配</div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">捕获当前曲目频响作为参考，后续曲目自动匹配</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="eq-btn eq-btn-sm eq-btn-primary" id="eq-capture-ref-btn">捕获参考</button>' +
            '<button class="eq-btn eq-btn-sm eq-btn-secondary" id="eq-match-ref-btn"' + (hasRef ? '' : ' disabled') + '>匹配参考</button>' +
            '<button class="eq-btn eq-btn-sm eq-btn-danger" id="eq-clear-ref-btn"' + (hasRef ? '' : ' style="display:none;"') + '>清除参考</button>' +
            '<span style="font-size:11px;color:rgba(255,255,255,0.4);align-self:center;" id="eq-ref-status">' + (hasRef ? '已有参考' : '无参考') + '</span>' +
            '</div></div>';
    }

    function bindPanelEvents() {
        $id('eq-close-btn').addEventListener('click', closePanel);
        $id('eq-toggle-btn').addEventListener('click', toggleEQ);
        $id('eq-reset-btn').addEventListener('click', function() {
            showConfirmDialog('确定重置所有设置？', function(ok) {
                if (!ok) return;
                safeRuntimeMessage({ action: 'reset-plugin' }, function() {
                    sendToMain('reset-plugin', {});
                    loadSettingsFromStorage().then(function() { renderTabContent(); updateStatus(); });
                    showToast('已重置');
                });
            });
        });

        panel.querySelectorAll('.eq-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                panel.querySelectorAll('.eq-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                renderTabContent();
            });
        });
    }

    function bindTabEvents() {
        switch (currentTab) {
            case 'eq': bindEQTabEvents(); initSpectrum(); break;
            case 'effects': bindEffectsTabEvents(); break;
            case 'advanced': bindAdvancedTabEvents(); break;
        }
    }

    function bindEQTabEvents() {
        panel.querySelectorAll('.eq-gain-slider').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var idx = parseInt(this.dataset.band);
                var val = parseFloat(this.value);
                var isInd = currentSettings && currentSettings.channelMode === 'independent';
                if (isInd) {
                    if (channelEditTarget === 'right') { if (currentSettings) currentSettings.rightGains[idx] = val; sendToMain('set-channel-gains', { channel: 'right', gains: currentSettings.rightGains }); }
                    else { if (currentSettings) currentSettings.leftGains[idx] = val; sendToMain('set-channel-gains', { channel: 'left', gains: currentSettings.leftGains }); }
                } else {
                    if (currentSettings) currentSettings.gains[idx] = val;
                    sendToMain('set-gain', { index: idx, gain: val });
                }
                var valSpan = this.parentElement.querySelector('.eq-band-val');
                if (valSpan) valSpan.textContent = val.toFixed(1);
                debounce('save-gains', function() { saveSettingsToStorage(currentSettings); }, 300);
            });
            slider.addEventListener('dblclick', function() {
                var idx = parseInt(this.dataset.band);
                this.value = 0;
                var isInd = currentSettings && currentSettings.channelMode === 'independent';
                if (isInd) {
                    if (channelEditTarget === 'right') { if (currentSettings) currentSettings.rightGains[idx] = 0; sendToMain('set-channel-gains', { channel: 'right', gains: currentSettings.rightGains }); }
                    else { if (currentSettings) currentSettings.leftGains[idx] = 0; sendToMain('set-channel-gains', { channel: 'left', gains: currentSettings.leftGains }); }
                } else {
                    if (currentSettings) currentSettings.gains[idx] = 0;
                    sendToMain('set-gain', { index: idx, gain: 0 });
                }
                var valSpan = this.parentElement.querySelector('.eq-band-val');
                if (valSpan) valSpan.textContent = '0.0';
                debounce('save-gains', function() { saveSettingsToStorage(currentSettings); }, 300);
            });
        });

        panel.querySelectorAll('.eq-band-q').forEach(function(input) {
            input.addEventListener('change', function() {
                var idx = parseInt(this.dataset.band);
                var val = parseFloat(this.value);
                if (isNaN(val)) val = Q_VALUE_DEFAULT;
                val = Math.max(Q_VALUE_MIN, Math.min(Q_VALUE_MAX, val));
                this.value = val.toFixed(1);
                if (currentSettings) currentSettings.qValues[idx] = val;
                sendToMain('set-q-value', { index: idx, q: val });
                debounce('save-q', function() { saveSettingsToStorage(currentSettings); }, 300);
            });
        });

        panel.querySelectorAll('.eq-preset-btn[data-preset]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var presetName = this.dataset.preset;
                var presetData = this.dataset.presetData ? JSON.parse(this.dataset.presetData) : null;
                safeRuntimeMessage({
                    action: 'apply-preset',
                    preset: presetName,
                    presetData: presetData
                }, function() {
                    sendToMain('apply-preset', { preset: presetName, presetData: presetData });
                    loadSettingsFromStorage().then(function() { renderTabContent(); });
                    showToast('已应用: ' + (presetData ? presetData.name : (EQ_PRESETS[presetName] ? EQ_PRESETS[presetName].name : presetName)));
                });
            });
        });

        panel.querySelectorAll('.eq-preset-delete-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var presetId = this.dataset.presetId;
                var presetName = customPresets.find(function(p) { return p.id === presetId; });
                showConfirmDialog('确定删除预设"' + (presetName ? presetName.name : presetId) + '"？', function(ok) {
                    if (!ok) return;
                    safeRuntimeMessage({ action: 'delete-custom-preset', presetId: presetId }, function() {
                        customPresets = customPresets.filter(function(p) { return p.id !== presetId; });
                        renderTabContent();
                        showToast('预设已删除');
                    });
                });
            });
        });

        var saveBtn = $id('eq-save-preset-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                showPresetNameDialog(function(name) {
                    if (!name) return;
                    var duplicate = customPresets.find(function(p) { return p.name === name; });
                    if (duplicate) {
                        showToast('预设名称"' + name + '"已存在，请使用其他名称');
                        return;
                    }
                    var preset = {
                        id: 'custom_' + Date.now(),
                        name: name,
                        gains: currentSettings ? currentSettings.gains.slice() : Array(31).fill(0),
                        qValues: currentSettings ? (currentSettings.qValues || Array(31).fill(1.4)).slice() : Array(31).fill(1.4),
                        effects: currentSettings && currentSettings.effects ? Object.assign({}, currentSettings.effects) : Object.assign({}, AUDIO_EFFECTS_DEFAULT)
                    };
                    safeRuntimeMessage({ action: 'save-custom-preset', preset: preset }, function() {
                        customPresets.push(preset);
                        renderTabContent();
                        showToast('预设已保存');
                    });
                });
            });
        }
    }

    function bindEffectsTabEvents() {
        var toggle = $id('eq-effects-toggle');
        if (toggle) {
            toggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                if (currentSettings) currentSettings.effectsEnabled = isActive;
                safeRuntimeMessage({ action: 'toggle-effects', enabled: isActive });
                sendToMain('toggle-effects', { enabled: isActive });
                saveSettingsToStorage(currentSettings);
            });
        }

        panel.querySelectorAll('.eq-slider[data-effect]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var effect = this.dataset.effect;
                var val = parseFloat(this.value);
                if (currentSettings && currentSettings.effects) currentSettings.effects[effect] = val;
                sendToMain('set-effect', { effect: effect, value: val });
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) valSpan.textContent = val;
                debounce('save-effect-' + effect, function() { saveSettingsToStorage(currentSettings); }, 300);
            });
        });

        var resetBtn = $id('eq-reset-effects-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                safeRuntimeMessage({ action: 'reset-effects' }, function() {
                    sendToMain('reset-effects', {});
                    loadSettingsFromStorage().then(function() { renderTabContent(); });
                    showToast('音效已重置');
                });
            });
        }
    }

    function bindAdvancedTabEvents() {
        var channelSelect = $id('eq-channel-mode');
        if (channelSelect) {
            channelSelect.addEventListener('change', function() {
                var mode = this.value;
                if (currentSettings) currentSettings.channelMode = mode;
                safeRuntimeMessage({ action: 'set-channel-mode', channelMode: mode });
                sendToMain('set-channel-mode', { channelMode: mode });
                saveSettingsToStorage(currentSettings);
                renderTabContent();
            });
        }

        var channelBtns = panel.querySelectorAll('.eq-channel-select');
        channelBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                channelEditTarget = this.getAttribute('data-channel-target');
                renderTabContent();
            });
        });

        var dynToggle = $id('eq-dynamic-eq-toggle');
        if (dynToggle) {
            dynToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                var dynEQ = currentSettings ? Object.assign({}, currentSettings.dynamicEQ) : Object.assign({}, DYNAMIC_EQ_DEFAULT);
                dynEQ.enabled = isActive;
                if (currentSettings) currentSettings.dynamicEQ = dynEQ;
                safeRuntimeMessage({ action: 'set-dynamic-eq', dynamicEQ: dynEQ });
                sendToMain('set-dynamic-eq', { dynamicEQ: dynEQ });
                saveSettingsToStorage(currentSettings);
            });
        }

        panel.querySelectorAll('.eq-slider[data-dyneq]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var param = this.dataset.dyneq;
                var val = parseFloat(this.value);
                var dynEQ = currentSettings ? Object.assign({}, currentSettings.dynamicEQ) : Object.assign({}, DYNAMIC_EQ_DEFAULT);
                dynEQ[param] = val;
                if (currentSettings) currentSettings.dynamicEQ = dynEQ;
                sendToMain('set-dynamic-eq', { dynamicEQ: dynEQ });
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) {
                    if (param === 'threshold') valSpan.textContent = val + 'dB';
                    else if (param === 'attack' || param === 'release') valSpan.textContent = val + 's';
                    else valSpan.textContent = val;
                }
                debounce('save-dyneq', function() {
                    safeRuntimeMessage({ action: 'set-dynamic-eq', dynamicEQ: dynEQ });
                    saveSettingsToStorage(currentSettings);
                }, 300);
            });
        });

        var msToggle = $id('eq-mid-side-toggle');
        if (msToggle) {
            msToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                if (currentSettings) currentSettings.midSideEnabled = isActive;
                safeRuntimeMessage({ action: 'toggle-mid-side', enabled: isActive });
                sendToMain('toggle-mid-side', { enabled: isActive });
                saveSettingsToStorage(currentSettings);
            });
        }

        panel.querySelectorAll('.eq-slider[data-ms]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var param = this.dataset.ms;
                var val = parseFloat(this.value);
                var channel = param === 'mid-boost' ? 'mid' : 'side';
                var gains = Array(31).fill(val);
                sendToMain('set-channel-gains', { channel: channel, gains: gains });
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) valSpan.textContent = val + 'dB';
            });
        });

        var lpToggle = $id('eq-linear-phase-toggle');
        if (lpToggle) {
            lpToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                if (currentSettings) currentSettings.linearPhaseEnabled = isActive;
                safeRuntimeMessage({ action: 'toggle-linear-phase', enabled: isActive });
                sendToMain('toggle-linear-phase', { enabled: isActive });
                saveSettingsToStorage(currentSettings);
            });
        }

        var captureBtn = $id('eq-capture-ref-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', function() {
                sendToMain('capture-reference', {});
                showToast('正在捕获参考频响...');
                captureBtn.disabled = true;
            });
        }

        var matchBtn = $id('eq-match-ref-btn');
        if (matchBtn) {
            matchBtn.addEventListener('click', function() {
                sendToMain('match-reference', {});
                showToast('正在匹配参考频响...');
                matchBtn.disabled = true;
            });
        }

        var clearBtn = $id('eq-clear-ref-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                sendToMain('clear-reference', {});
                showToast('参考已清除');
                clearBtn.style.display = 'none';
                var statusEl = $id('eq-ref-status');
                if (statusEl) statusEl.textContent = '无参考';
                var mBtn = $id('eq-match-ref-btn');
                if (mBtn) mBtn.disabled = true;
            });
        }

        panel.querySelectorAll('.eq-slider[data-effect]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var effect = this.dataset.effect;
                var val = parseFloat(this.value);
                if (currentSettings && currentSettings.effects) currentSettings.effects[effect] = val;
                sendToMain('set-effect', { effect: effect, value: val });
                safeRuntimeMessage({ action: 'set-effect', effect: effect, value: val });
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) valSpan.textContent = val;
                debounce('save-effect-' + effect, function() { saveSettingsToStorage(currentSettings); }, 300);
            });
        });
    }

    function initSpectrum() {
        spectrumCanvas = $id('moekoe-eq-spectrum');
        if (!spectrumCanvas) return;
        spectrumCtx = spectrumCanvas.getContext('2d');
        spectrumCanvas.width = spectrumCanvas.offsetWidth * (window.devicePixelRatio || 1);
        spectrumCanvas.height = spectrumCanvas.offsetHeight * (window.devicePixelRatio || 1);
        spectrumCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        if (!isSpectrumActive) startSpectrumLoop();
    }

    var lastSpectrumData = null;
    function startSpectrumLoop() {
        isSpectrumActive = true;
        function draw() {
            if (!isSpectrumActive || !spectrumCanvas || !isPanelOpen) {
                isSpectrumActive = false;
                return;
            }
            if (lastSpectrumData) drawSpectrum(lastSpectrumData);
            sendToMain('get-spectrum', {});
            spectrumAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    function drawSpectrum(data) {
        if (!spectrumCtx || !spectrumCanvas || !data) return;
        var dpr = window.devicePixelRatio || 1;
        var w = spectrumCanvas.offsetWidth;
        var h = spectrumCanvas.offsetHeight;
        if (w <= 0 || h <= 0) return;
        if (spectrumCanvas.width !== Math.round(w * dpr) || spectrumCanvas.height !== Math.round(h * dpr)) {
            spectrumCanvas.width = Math.round(w * dpr);
            spectrumCanvas.height = Math.round(h * dpr);
            spectrumCtx.scale(dpr, dpr);
        }
        spectrumCtx.clearRect(0, 0, w, h);

        var input = data.input;
        var output = data.output;
        if (!input || !output) return;

        var barCount = 64;
        var barWidth = w / barCount - 1;
        var sampleRate = data.sampleRate || 44100;
        var nyquist = sampleRate / 2;
        var binCount = input.length;
        var minFreq = 20;
        var maxFreq = Math.min(20000, nyquist);
        var logMin = Math.log10(minFreq);
        var logMax = Math.log10(maxFreq);

        function getAvgValue(freqData, startBin, endBin) {
            var sum = 0, count = 0;
            var s = Math.max(0, Math.min(binCount - 1, startBin));
            var e = Math.max(0, Math.min(binCount - 1, endBin));
            for (var k = s; k <= e; k++) { sum += freqData[k] || 0; count++; }
            return count > 0 ? sum / count / 255 : 0;
        }

        spectrumCtx.fillStyle = 'rgba(108,92,231,0.3)';
        for (var i = 0; i < barCount; i++) {
            var fLow = Math.pow(10, logMin + (logMax - logMin) * i / barCount);
            var fHigh = Math.pow(10, logMin + (logMax - logMin) * (i + 1) / barCount);
            var binLow = Math.round(fLow / nyquist * binCount);
            var binHigh = Math.round(fHigh / nyquist * binCount);
            var val = getAvgValue(input, binLow, binHigh);
            var barH = val * h;
            spectrumCtx.fillRect(i * (barWidth + 1), h - barH, barWidth, barH);
        }

        spectrumCtx.fillStyle = 'rgba(162,155,254,0.6)';
        for (var i = 0; i < barCount; i++) {
            var fLow = Math.pow(10, logMin + (logMax - logMin) * i / barCount);
            var fHigh = Math.pow(10, logMin + (logMax - logMin) * (i + 1) / barCount);
            var binLow = Math.round(fLow / nyquist * binCount);
            var binHigh = Math.round(fHigh / nyquist * binCount);
            var val = getAvgValue(output, binLow, binHigh);
            var barH = val * h;
            spectrumCtx.fillRect(i * (barWidth + 1), h - barH, barWidth, barH);
        }

        if (currentSettings && currentSettings.gains) {
            var displayGains = currentSettings.gains;
            if (currentSettings.channelMode === 'independent') {
                displayGains = channelEditTarget === 'right' ? (currentSettings.rightGains || currentSettings.gains) : (currentSettings.leftGains || currentSettings.gains);
            }
            spectrumCtx.strokeStyle = 'rgba(46,213,115,0.8)';
            spectrumCtx.lineWidth = 1.5;
            spectrumCtx.beginPath();
            for (var i = 0; i < 31; i++) {
                var freq = EQ_FREQUENCIES[i];
                var x = (Math.log10(freq) - logMin) / (logMax - logMin) * w;
                var y = h / 2 - (displayGains[i] / GAIN_MAX) * (h / 2);
                if (i === 0) spectrumCtx.moveTo(x, y);
                else spectrumCtx.lineTo(x, y);
            }
            spectrumCtx.stroke();
        }
    }

    function toggleEQ() {
        if (!currentSettings) return;
        currentSettings.enabled = !currentSettings.enabled;
        safeRuntimeMessage({ action: 'toggle-eq', enabled: currentSettings.enabled });
        sendToMain('toggle-eq', { enabled: currentSettings.enabled });
        updateStatus();
        saveSettingsToStorage(currentSettings);
    }

    function updateStatus() {
        var dot = $id('eq-status-dot');
        var text = $id('eq-status-text');
        var btn = $id('eq-toggle-btn');
        if (!currentSettings) return;

        if (currentSettings.pluginDisabled) {
            if (dot) { dot.className = 'eq-status-dot off'; }
            if (text) text.textContent = '插件已禁用';
            if (btn) btn.textContent = '已禁用';
        } else if (currentSettings.enabled) {
            if (dot) { dot.className = 'eq-status-dot on'; }
            if (text) text.textContent = 'EQ运行中';
            if (btn) btn.textContent = '关闭EQ';
        } else {
            if (dot) { dot.className = 'eq-status-dot off'; }
            if (text) text.textContent = 'EQ已关闭';
            if (btn) btn.textContent = '开启EQ';
        }
    }

    function openPanel() {
createPanel();
        isPanelOpen = true;
        panel.classList.add('visible');
        loadSettingsFromStorage().then(function() {
            renderTabContent();
            updateStatus();
        });
    }

    function closePanel() {
        if (panel) panel.classList.remove('visible');
        isPanelOpen = false;
        isSpectrumActive = false;
        if (spectrumAnimId) { cancelAnimationFrame(spectrumAnimId); spectrumAnimId = null; }
    }

    function showFabButton() {
        ensureShadowHost();
        if (!shadowRoot) {
            setTimeout(showFabButton, 100);
            return;
        }
        injectCSS();
        if (fabButton) { fabButton.style.display = 'flex'; isFabVisible = true; return; }
        fabButton = document.createElement('button');
        fabButton.id = 'moekoe-eq-fab';
        fabButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>';
        fabButton.addEventListener('click', function() {
            if (isPanelOpen) closePanel();
            else openPanel();
        });
        shadowRoot.appendChild(fabButton);
        isFabVisible = true;
    }

    function hideFabButton() {
        if (fabButton) { fabButton.style.display = 'none'; isFabVisible = false; }
    }

    var lastStateVersion = 0;

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        var data = event.data;
        if (!data) return;

        if (MSG_SRC && data.source === MSG_SRC.MAIN) {
            switch (data.type) {
                case 'request-settings':
                    if (currentSettings) {
                        sendToMain('storage-settings', currentSettings);
                    } else {
                        loadSettingsFromStorage().then(function(s) {
                            sendToMain('storage-settings', s);
                        });
                    }
                    break;
                case 'state-change':
                case 'state-response':
                    if (data.data) {
                        if (data.version && data.version <= lastStateVersion) {
                            break;
                        }
                        if (data.version) {
                            lastStateVersion = data.version;
                        }
                        currentSettings = Object.assign(currentSettings || buildDefaultSettingsLocal(), data.data);
                        if (isPanelOpen) updateStatus();
                        saveSettingsToStorage(currentSettings);
                    }
                    break;
                case 'spectrum-response':
                    if (data.data) { lastSpectrumData = data.data; if (isPanelOpen) drawSpectrum(data.data); }
                    break;
                case 'error':
                    if (data.data) {
                        showErrorToast(data.data.message || 'EQ插件发生错误');
                    }
                    break;
                case 'capture-reference-complete':
                    showToast('已捕获参考频响');
                    var capBtn = $id('eq-capture-ref-btn');
                    if (capBtn) capBtn.disabled = false;
                    var statusEl = $id('eq-ref-status');
                    if (statusEl) statusEl.textContent = '已有参考';
                    var mBtn = $id('eq-match-ref-btn');
                    if (mBtn) mBtn.disabled = false;
                    var clrBtn = $id('eq-clear-ref-btn');
                    if (clrBtn) clrBtn.style.display = '';
                    break;
                case 'match-reference-complete':
                    showToast('已匹配参考频响');
                    var matBtn = $id('eq-match-ref-btn');
                    if (matBtn) matBtn.disabled = false;
                    loadSettingsFromStorage().then(function() { renderTabContent(); });
                    break;
            }
        }
    });

    function showErrorToast(message) {
        ensureShadowHost();
        var existingToast = $id('moekoe-eq-error-toast');
        if (existingToast) existingToast.remove();

        var toast = document.createElement('div');
        toast.id = 'moekoe-eq-error-toast';
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ff4444;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;';
        toast.textContent = message;
        shadowRoot.appendChild(toast);

        setTimeout(function() {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    function setupRuntimeListener() {
        if (!isExtensionContextValid()) return;
        try {
            chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
                if (!message) return;

                if (message.action === 'open-panel') {
                    showFabButton();
                    openPanel();
                    sendResponse({ success: true });
                    return;
                }

                if (!MSG_SRC || message.source !== MSG_SRC.BACKGROUND) return;

        switch (message.type) {
            case 'toggle-eq':
                if (currentSettings) currentSettings.enabled = message.data.enabled;
                sendToMain('toggle-eq', { enabled: message.data.enabled });
                updateStatus();
                break;
            case 'toggle-plugin-disabled':
                if (currentSettings) currentSettings.pluginDisabled = message.data.disabled;
                sendToMain('plugin-disabled', { disabled: message.data.disabled });
                updateStatus();
                break;
            case 'apply-preset':
                if (currentSettings) {
                    currentSettings.preset = message.data.preset;
                    currentSettings.gains = message.data.gains;
                    if (message.data.effects) {
                        currentSettings.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, message.data.effects);
                        currentSettings.effectsEnabled = true;
                    }
                }
                sendToMain('apply-preset', {
                    preset: message.data.preset,
                    presetData: message.data.presetData
                });
                if (isPanelOpen) renderTabContent();
                break;
            case 'reset-eq':
            case 'reset-plugin':
            case 'reset-effects':
                loadSettingsFromStorage().then(function() {
                    if (isPanelOpen) renderTabContent();
                    updateStatus();
                });
                break;
            case 'set-effect':
                if (currentSettings && currentSettings.effects) currentSettings.effects[message.data.effect] = message.data.value;
                sendToMain('set-effect', { effect: message.data.effect, value: message.data.value });
                break;
            case 'toggle-effects':
                if (currentSettings) currentSettings.effectsEnabled = message.data.enabled;
                sendToMain('toggle-effects', { enabled: message.data.enabled });
                break;
            case 'set-channel-mode':
                if (currentSettings) currentSettings.channelMode = message.data.channelMode;
                sendToMain('set-channel-mode', { channelMode: message.data.channelMode });
                break;
            case 'set-dynamic-eq':
                if (currentSettings) currentSettings.dynamicEQ = message.data.dynamicEQ;
                sendToMain('set-dynamic-eq', { dynamicEQ: message.data.dynamicEQ });
                break;
            case 'toggle-mid-side':
                if (currentSettings) currentSettings.midSideEnabled = message.data.enabled;
                sendToMain('toggle-mid-side', { enabled: message.data.enabled });
                break;
            case 'toggle-linear-phase':
                if (currentSettings) currentSettings.linearPhaseEnabled = message.data.enabled;
                sendToMain('toggle-linear-phase', { enabled: message.data.enabled });
                break;
            case 'set-q-values':
                if (currentSettings) currentSettings.qValues = message.data.qValues;
                sendToMain('set-q-values', { qValues: message.data.qValues });
                break;
        }
        return true;
    });
        } catch (e) {
            console.warn('[MoeKoeEQ-CT] Runtime listener error:', e);
        }
    }

    function init() {
        setupRuntimeListener();
showFabButton();

        loadSettingsFromStorage().then(function(settings) {
            if (settings.pluginDisabled) {
                hideFabButton();
                return;
            }
            sendToMain('storage-settings', settings);
            sendToMain('get-state', {});
        }).catch(function() {
            sendToMain('get-state', {});
        });

        try { loadCustomPresets(); } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__MOEKOE_EQ_PANEL__ = {
        showFabButton: showFabButton,
        hideFabButton: hideFabButton,
        openPanel: openPanel,
        closePanel: closePanel,
        showPanel: openPanel
    };
})();
