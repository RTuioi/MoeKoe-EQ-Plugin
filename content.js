(function() {
    'use strict';

    if (window.__MOEKOE_EQ_CONTENT__) return;
    window.__MOEKOE_EQ_CONTENT__ = true;

    // === FALLBACK 常量 ===
    // 注意：完整定义见 shared/constants.js。修改 shared/constants.js 时务必同步更新此处的 fallback，
    // 并同步更新 background.js 和 inject.js 中的 fallback 块。
    if (typeof EQ_FREQUENCIES === 'undefined') {
        window.EQ_FREQUENCIES = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
        window.EQ_PRESETS = { flat:{name:'平坦',gains:Array(31).fill(0)} };
        window.AUDIO_EFFECTS_DEFAULT = {bassBoost:0,dynamicBass:0,warmth:0,vocalEnhance:0,presence:0,clarity:0,trebleBoost:0,dynamicEnhance:0,ambiance:0,surround:0,reverb:0,outputGain:50,stereoBalance:50,loudnessCompensation:0,harmonicExciter:0,crossfeed:0,subHarmonic:0,tubeSaturation:0,multibandComp:0,deEsser:0,stereoWidener:0,tapeEmulation:0,loudnessMaximizer:0};
        window.DYNAMIC_EQ_DEFAULT = {enabled:false,threshold:-30,ratio:6,attack:0.02,release:0.15};
        window.DEFAULT_SETTINGS = {enabled:true,gains:Array(31).fill(0),qValues:Array(31).fill(1.4),preset:'flat',pluginDisabled:false,effects:null,effectsEnabled:true,channelMode:'stereo',leftGains:Array(31).fill(0),rightGains:Array(31).fill(0),leftQValues:Array(31).fill(1.4),rightQValues:Array(31).fill(1.4),dynamicEQ:null,midSideEnabled:false,midGains:Array(31).fill(0),sideGains:Array(31).fill(0),linearPhaseEnabled:false,referenceProfile:null,dcFilter:null,dither:null,truePeakLimiter:null};
        window.MSG_SRC = {CONTENT:'__moekoe_eq_content__',MAIN:'__moekoe_eq_main__',BACKGROUND:'__moekoe_eq_background__',POPUP:'__moekoe_eq_popup__'};
        window.Q_VALUE_MIN = 0.1; window.Q_VALUE_MAX = 18.0; window.Q_VALUE_DEFAULT = 1.4; window.Q_VALUE_STEP = 0.1;
        window.GAIN_MIN = -6; window.GAIN_MAX = 6; window.GAIN_STEP = 0.5;
        window.CHANNEL_MODES = ['stereo','left','right','independent'];
        window.SHARE_CODE_VERSION = '2.0';
        window.SHARE_CODE_PREFIX = 'MEQ:';
        window.DC_FILTER_DEFAULT = { enabled: true, cutoffFreq: 20, Q: 0.707 };
        window.DITHER_DEFAULT = { enabled: false, targetBits: 16, noiseShaping: true };
        window.TRUE_PEAK_LIMITER_DEFAULT = { enabled: true, threshold: -1.0, ceiling: -0.5, release: 0.1, oversample: 4 };
        console.warn('[MoeKoeEQ-CONTENT] constants.js not loaded, using inline fallback');
    }

    var panel = null;
    var eqButton = null;
    var isPanelOpen = false;
    var channelEditTarget = 'left';
    var shadowHost = null;
    var shadowRoot = null;
    var _msgTargetOrigin = window.location.origin || '*';

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
    var currentTab = 'eq';
    var currentSettings = null;
    var customPresets = [];
    var lastPresetChangeTime = 0;
    var panelOpenTime = 0;
    var PANEL_LOAD_GRACE_PERIOD = 3000;
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
        box.style.cssText = 'background:#1e2127;border-radius:12px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        box.innerHTML = '<div style="color:#cdd6e0;font-size:16px;margin-bottom:16px;">保存预设</div>' +
            '<input id="moekoe-preset-input" type="text" placeholder="输入预设名称" style="width:100%;padding:10px 12px;border:1px solid rgba(90,159,212,0.15);border-radius:8px;background:#1a1d22;color:#cdd6e0;font-size:14px;outline:none;box-sizing:border-box;" />' +
            '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
            '<button id="moekoe-preset-cancel" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.15);color:#787e8a;cursor:pointer;">取消</button>' +
            '<button id="moekoe-preset-ok" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.3);color:#5a9fd4;cursor:pointer;">确定</button>' +
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
        box.style.cssText = 'background:#1e2127;border-radius:12px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        box.innerHTML = '<div style="color:#cdd6e0;font-size:14px;margin-bottom:20px;line-height:1.5;">' + escapeHTML(message) + '</div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="moekoe-confirm-cancel" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.15);color:#787e8a;cursor:pointer;">取消</button>' +
            '<button id="moekoe-confirm-ok" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(224,108,117,0.3);color:#e06c75;cursor:pointer;">确定</button>' +
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
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e2127;color:#cdd6e0;border:1px solid rgba(90,159,212,0.15);padding:10px 24px;border-radius:8px;font-size:14px;z-index:2147483647;pointer-events:none;transition:opacity 0.3s;';
        shadowRoot.appendChild(t);
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function() { if (t.parentNode) t.remove(); }, 2000);
    }

    // === 预设分享码 ===
    var SHARE_ITEMS = [
        { key: 'eq',          label: 'EQ 增益与 Q 值（31 段）' },
        { key: 'effects',     label: '音效增强（低音/人声/混响等）' },
        { key: 'dynamicEQ',   label: '动态 EQ' },
        { key: 'channelMode', label: '声道模式与左右独立 EQ' },
        { key: 'midSide',     label: '中侧链（M/S）设置' },
        { key: 'linearPhase', label: '线性相位开关' },
        { key: 'preset',      label: '预设名称' },
        { key: 'dcFilter',    label: 'DC 偏移过滤' },
        { key: 'dither',      label: '位深抖动 (Dither)' },
        { key: 'truePeak',    label: '真峰值限幅器' }
    ];

    function encodeShareCode(settings, selectedItems) {
        if (!settings) return '';
        var payload = { v: SHARE_CODE_VERSION };
        if (selectedItems.indexOf('eq') >= 0) {
            payload.gains = settings.gains;
            payload.qValues = settings.qValues;
        }
        if (selectedItems.indexOf('effects') >= 0) {
            payload.effects = settings.effects;
            payload.effectsEnabled = settings.effectsEnabled !== false;
        }
        if (selectedItems.indexOf('dynamicEQ') >= 0) {
            payload.dynamicEQ = settings.dynamicEQ;
        }
        if (selectedItems.indexOf('channelMode') >= 0) {
            payload.channelMode = settings.channelMode;
            payload.leftGains = settings.leftGains;
            payload.rightGains = settings.rightGains;
            payload.leftQValues = settings.leftQValues;
            payload.rightQValues = settings.rightQValues;
        }
        if (selectedItems.indexOf('midSide') >= 0) {
            payload.midSideEnabled = settings.midSideEnabled || false;
            payload.midGains = settings.midGains;
            payload.sideGains = settings.sideGains;
        }
        if (selectedItems.indexOf('linearPhase') >= 0) {
            payload.linearPhaseEnabled = settings.linearPhaseEnabled || false;
        }
        if (selectedItems.indexOf('preset') >= 0) {
            payload.preset = settings.preset || 'flat';
        }
        if (selectedItems.indexOf('dcFilter') >= 0) {
            payload.dcFilter = settings.dcFilter || null;
        }
        if (selectedItems.indexOf('dither') >= 0) {
            payload.dither = settings.dither || null;
        }
        if (selectedItems.indexOf('truePeak') >= 0) {
            payload.truePeakLimiter = settings.truePeakLimiter || null;
        }
        try {
            var json = JSON.stringify(payload);
            var compressed = LZString.compressToBase64(json);
            return SHARE_CODE_PREFIX + SHARE_CODE_VERSION + ':' + compressed;
        } catch (e) {
            console.error('[MoeKoeEQ] encodeShareCode error:', e);
            return '';
        }
    }

    function decodeShareCode(code) {
        if (!code || typeof code !== 'string') return { error: '分享码为空' };
        code = code.trim();
        if (code.indexOf(SHARE_CODE_PREFIX) !== 0) {
            return { error: '无效的分享码（前缀错误）' };
        }
        var withoutPrefix = code.substring(SHARE_CODE_PREFIX.length);
        var colonIdx = withoutPrefix.indexOf(':');
        if (colonIdx < 0) {
            return { error: '无效的分享码（缺少版本号）' };
        }
        var version = withoutPrefix.substring(0, colonIdx);
        var compressed = withoutPrefix.substring(colonIdx + 1);
        var json;
        try {
            json = LZString.decompressFromBase64(compressed);
        } catch (e) {
            return { error: '分享码解压失败：' + e.message };
        }
        if (!json) return { error: '分享码解压失败（数据损坏）' };
        try {
            var payload = JSON.parse(json);
            payload.v = version;
            return { success: true, data: payload };
        } catch (e) {
            return { error: '分享码 JSON 解析失败：' + e.message };
        }
    }

    function applyDecodedShareCode(payload) {
        if (!currentSettings) currentSettings = buildDefaultSettingsLocal();
        if (payload.gains && payload.gains.length === 31) currentSettings.gains = payload.gains.slice();
        if (payload.qValues && payload.qValues.length === 31) currentSettings.qValues = payload.qValues.slice();
        if (payload.effects) currentSettings.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, payload.effects);
        if (typeof payload.effectsEnabled !== 'undefined') currentSettings.effectsEnabled = payload.effectsEnabled;
        if (payload.dynamicEQ) currentSettings.dynamicEQ = Object.assign({}, DYNAMIC_EQ_DEFAULT, payload.dynamicEQ);
        if (typeof payload.channelMode === 'string' && CHANNEL_MODES.indexOf(payload.channelMode) >= 0) {
            currentSettings.channelMode = payload.channelMode;
        }
        if (payload.leftGains && payload.leftGains.length === 31) currentSettings.leftGains = payload.leftGains.slice();
        if (payload.rightGains && payload.rightGains.length === 31) currentSettings.rightGains = payload.rightGains.slice();
        if (payload.leftQValues && payload.leftQValues.length === 31) currentSettings.leftQValues = payload.leftQValues.slice();
        if (payload.rightQValues && payload.rightQValues.length === 31) currentSettings.rightQValues = payload.rightQValues.slice();
        if (typeof payload.midSideEnabled !== 'undefined') currentSettings.midSideEnabled = payload.midSideEnabled;
        if (payload.midGains && payload.midGains.length === 31) currentSettings.midGains = payload.midGains.slice();
        if (payload.sideGains && payload.sideGains.length === 31) currentSettings.sideGains = payload.sideGains.slice();
        if (typeof payload.linearPhaseEnabled !== 'undefined') currentSettings.linearPhaseEnabled = payload.linearPhaseEnabled;
        if (typeof payload.preset === 'string') currentSettings.preset = payload.preset;
        if (payload.dcFilter && typeof payload.dcFilter === 'object') {
            currentSettings.dcFilter = Object.assign({}, DC_FILTER_DEFAULT, payload.dcFilter);
        }
        if (payload.dither && typeof payload.dither === 'object') {
            currentSettings.dither = Object.assign({}, DITHER_DEFAULT, payload.dither);
        }
        if (payload.truePeakLimiter && typeof payload.truePeakLimiter === 'object') {
            currentSettings.truePeakLimiter = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT, payload.truePeakLimiter);
        }
        // 同步到 inject.js (MAIN world) 和 storage
        sendToMain('apply-settings', currentSettings);
        saveSettingsToStorage(currentSettings);
    }

    function showShareDialog() {
        ensureShadowHost();
        var existing = $id('moekoe-share-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'moekoe-share-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#1e2127;border-radius:12px;padding:20px;width:440px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
        var checkboxesHTML = SHARE_ITEMS.map(function(item) {
            return '<label style="display:block;padding:6px 0;color:#cdd6e0;font-size:13px;cursor:pointer;">' +
                '<input type="checkbox" class="share-item" value="' + item.key + '" checked style="margin-right:8px;vertical-align:middle;" />' +
                '<span style="vertical-align:middle;">' + item.label + '</span></label>';
        }).join('');
        box.innerHTML =
            '<div style="color:#5a9fd4;font-size:15px;font-weight:600;margin-bottom:12px;">分享 / 导入预设</div>' +
            '<div style="border-bottom:1px solid rgba(90,159,212,0.1);margin-bottom:12px;padding-bottom:12px;">' +
                '<div style="color:#cdd6e0;font-size:13px;margin-bottom:8px;">选择要分享的内容：</div>' +
                checkboxesHTML +
                '<div style="display:flex;gap:8px;margin-top:10px;">' +
                    '<button id="moekoe-share-generate" style="flex:1;padding:8px;border:none;border-radius:8px;background:rgba(90,159,212,0.2);color:#5a9fd4;cursor:pointer;font-size:13px;">生成分享码</button>' +
                    '<button id="moekoe-share-copy" style="flex:1;padding:8px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.3);color:#5a9fd4;cursor:pointer;font-size:13px;">复制分享码</button>' +
                '</div>' +
                '<textarea id="moekoe-share-output" readonly placeholder="点击「生成分享码」后，分享码会显示在这里" style="width:100%;min-height:60px;max-height:120px;overflow-y:auto;margin-top:10px;padding:8px;border:1px solid rgba(90,159,212,0.15);border-radius:8px;background:#1a1d22;color:#cdd6e0;font-size:12px;font-family:monospace;outline:none;box-sizing:border-box;resize:vertical;"></textarea>' +
            '</div>' +
            '<div style="padding-top:4px;">' +
                '<div style="color:#cdd6e0;font-size:13px;margin-bottom:8px;">导入分享码（粘贴到下方输入框）：</div>' +
                '<textarea id="moekoe-share-input" placeholder="粘贴以 MEQ: 开头的分享码" style="width:100%;min-height:60px;max-height:120px;overflow-y:auto;padding:8px;border:1px solid rgba(90,159,212,0.15);border-radius:8px;background:#1a1d22;color:#cdd6e0;font-size:12px;font-family:monospace;outline:none;box-sizing:border-box;resize:vertical;"></textarea>' +
                '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">' +
                    '<button id="moekoe-share-cancel" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.15);color:#787e8a;cursor:pointer;font-size:13px;">关闭</button>' +
                    '<button id="moekoe-share-import" style="padding:8px 20px;border:none;border-radius:8px;background:transparent;border:1px solid rgba(90,159,212,0.3);color:#5a9fd4;cursor:pointer;font-size:13px;">导入</button>' +
                '</div>' +
            '</div>';
        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);
        var closed = false;
        function close() { if (closed) return; closed = true; if (overlay.parentNode) overlay.remove(); }
        $id('moekoe-share-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        $id('moekoe-share-generate').addEventListener('click', function() {
            var selected = [];
            var inputs = shadowRoot.querySelectorAll('.share-item');
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].checked) selected.push(inputs[i].value);
            }
            var code = encodeShareCode(currentSettings, selected);
            $id('moekoe-share-output').value = code || '生成失败';
        });
        $id('moekoe-share-copy').addEventListener('click', function() {
            var out = $id('moekoe-share-output');
            if (!out.value || out.value === '生成失败') { showToast('请先生成分享码'); return; }
            out.select();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(out.value).then(function() { showToast('已复制到剪贴板'); }, function() {
                        document.execCommand('copy');
                        showToast('已复制');
                    });
                } else {
                    document.execCommand('copy');
                    showToast('已复制');
                }
            } catch (e) {
                showToast('复制失败：' + e.message);
            }
        });
        $id('moekoe-share-import').addEventListener('click', function() {
            var code = $id('moekoe-share-input').value.trim();
            if (!code) { showToast('请粘贴分享码'); return; }
            var result = decodeShareCode(code);
            if (result.error) { showToast(result.error); return; }
            showConfirmDialog('确认导入分享码？\n导入后当前设置会被覆盖（仅覆盖分享码包含的项目）', function(ok) {
                if (!ok) return;
                applyDecodedShareCode(result.data);
                renderTabContent();
                updateStatus();
                showToast('分享码导入成功');
                close();
            });
        });
    }


    function isExtensionContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    // === 使用说明 modal ===
    var HELP_VERSION_KEY = 'moekoeEqLastSeenVersion';

    function getCurrentPluginVersion() {
        try {
            return chrome.runtime.getManifest().version || '0';
        } catch (e) {
            return '0';
        }
    }

    // 首次安装或更新检测：版本不同则弹出引导卡片
    function checkFirstRunOrUpdate() {
        try {
            if (!chrome.storage || !chrome.storage.local) return;
            chrome.storage.local.get([HELP_VERSION_KEY], function(result) {
                var lastSeen = result[HELP_VERSION_KEY];
                var current = getCurrentPluginVersion();
                if (lastSeen !== current) {
                    showWelcomeHint(current, lastSeen);
                }
            });
        } catch (e) { /* ignore */ }
    }

    function markVersionSeen() {
        try {
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [HELP_VERSION_KEY]: getCurrentPluginVersion() });
            }
        } catch (e) { /* ignore */ }
    }

    // 引导提示卡片（非全屏 modal，聚焦于面板附近）
    function showWelcomeHint(currentVersion, lastSeen) {
        ensureShadowHost();
        var existing = $id('moekoe-hint-overlay');
        if (existing) existing.remove();
        var isFirstInstall = !lastSeen;
        var title = isFirstInstall ? '欢迎使用 31 段均衡器' : ('已更新到 v' + currentVersion);
        var subtitle = isFirstInstall
            ? '每一份热爱，都有旋律回响'
            : '查看本次更新带来的新功能';

        var overlay = document.createElement('div');
        overlay.id = 'moekoe-hint-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);z-index:2147483645;display:flex;align-items:flex-start;justify-content:flex-end;padding:80px 24px 0 0;pointer-events:auto;';
        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1e2127 0%,#252a35 100%);border:1px solid rgba(90,159,212,0.4);border-radius:12px;padding:20px;width:320px;box-shadow:0 8px 32px rgba(90,159,212,0.3),0 0 0 1px rgba(90,159,212,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;animation:moekoeHintIn 0.4s ease-out;position:relative;';
        card.innerHTML =
            '<div style="position:absolute;top:-8px;left:-8px;width:16px;height:16px;background:#5a9fd4;border-radius:50%;box-shadow:0 0 12px rgba(90,159,212,0.8);"></div>' +
            '<div style="color:#5a9fd4;font-size:11px;font-weight:600;letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;">EQ PLUGIN v' + currentVersion + '</div>' +
            '<div style="color:#e8ecf2;font-size:18px;font-weight:600;margin-bottom:8px;line-height:1.3;">' + title + '</div>' +
            '<div style="color:#a8b0bd;font-size:13px;line-height:1.6;margin-bottom:18px;font-style:italic;">"' + subtitle + '"</div>' +
            '<div style="color:#787e8a;font-size:12px;margin-bottom:16px;line-height:1.5;">点击「查看说明」了解如何使用，或「跳过」直接开始调音。</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button id="moekoe-hint-skip" style="flex:1;padding:9px;border:1px solid rgba(120,126,138,0.4);border-radius:8px;background:transparent;color:#a8b0bd;cursor:pointer;font-size:13px;">跳过</button>' +
                '<button id="moekoe-hint-view" style="flex:1.5;padding:9px;border:none;border-radius:8px;background:#5a9fd4;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">查看说明</button>' +
            '</div>';

        overlay.appendChild(card);
        var closeHint = function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
        var skipBtn = card.querySelector('#moekoe-hint-skip');
        var viewBtn = card.querySelector('#moekoe-hint-view');
        if (skipBtn) skipBtn.addEventListener('click', function() {
            markVersionSeen();
            closeHint();
        });
        if (viewBtn) viewBtn.addEventListener('click', function() {
            markVersionSeen();
            closeHint();
            setTimeout(showHelpDialog, 200);
        });
        document.body.appendChild(overlay);

        // 添加进入动画 keyframes（一次性）
        if (!document.getElementById('moekoe-hint-style')) {
            var style = document.createElement('style');
            style.id = 'moekoe-hint-style';
            style.textContent = '@keyframes moekoeHintIn{from{opacity:0;transform:translateY(-12px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}';
            document.head.appendChild(style);
        }
    }

    function showHelpDialog() {
        ensureShadowHost();
        var existing = $id('moekoe-help-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'moekoe-help-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:2147483646;display:flex;align-items:center;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#1e2127;border-radius:12px;padding:24px;width:560px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#cdd6e0;';
        var detailsStyle = 'background:#1a1d22;border-radius:8px;margin-bottom:10px;border:1px solid rgba(90,159,212,0.1);';
        var summaryStyle = 'padding:11px 14px;cursor:pointer;font-size:14px;font-weight:600;color:#5a9fd4;list-style:none;';
        var contentStyle = 'padding:0 14px 14px 14px;font-size:13px;line-height:1.75;color:#a8b0bd;';
        var itemStyle = 'margin:10px 0;';
        var titleStyle = 'color:#e8ecf2;font-weight:600;';
        var quoteStyle = 'color:#7a93b8;font-style:italic;border-left:2px solid rgba(90,159,212,0.4);padding-left:10px;margin:10px 0;';
        var tagStyle = 'display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;margin-right:5px;';
        var lowTag = '<span style="' + tagStyle + 'background:rgba(180,120,200,0.2);color:#c890d8;">低频</span>';
        var midTag = '<span style="' + tagStyle + 'background:rgba(90,159,212,0.2);color:#5a9fd4;">中频</span>';
        var highTag = '<span style="' + tagStyle + 'background:rgba(90,200,150,0.2);color:#5ac896;">高频</span>';

        box.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(90,159,212,0.15);">' +
                '<div style="color:#5a9fd4;font-size:17px;font-weight:600;">使用说明</div>' +
                '<div style="color:#787e8a;font-size:11px;">v' + getCurrentPluginVersion() + '</div>' +
            '</div>' +

            // === 分区 1：欢迎 ===
            '<details open style="' + detailsStyle + '">' +
                '<summary style="' + summaryStyle + '">🎵 欢迎使用</summary>' +
                '<div style="' + contentStyle + '">' +
                    '<div style="' + quoteStyle + '">每一个热爱音乐的人，总有一段频率，与你同频共振；<br>每一份热爱，都有旋律回响。</div>' +
                    '<div style="' + itemStyle + '">本插件为 MoeKoeMusic 提供 均衡器与多种音效增强。</div>' +
                    '<div style="' + itemStyle + '">如果第一次使用，建议从「快速阅读」开始；随后阅读下方各项使用指南；遇到问题可直达底部「常见问题」。</div>' +
                    '<div style="' + itemStyle + '">插件不够完善,功能不少 ,但是可能有些不好用...哈哈,这种就有点像那种想法很好 但能力不足  </div>' +
                '</div>' +
            '</details>' +

            // === 分区 2：快速阅读 ===
            '<details open style="' + detailsStyle + '">' +
                '<summary style="' + summaryStyle + '">🚀 快速阅读（新手必读）</summary>' +
                '<div style="' + contentStyle + '">' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">什么是均衡器？</span><br>均衡器（EQ）的核心作用是调节音频不同频率段的音量大小，从而修正音色、优化听感。本质是给声音"调色"，不修改音源文件，只改变你听到的音色。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">三大频段速记</span></div>' +
                    '<div style="padding-left:8px;border-left:2px solid rgba(180,120,200,0.3);margin:6px 0;">' + lowTag + '<b style="color:#e8ecf2;">低频（20-250Hz）</b>：浑厚低音。调重 → 震撼有力；调轻 → 干净不轰隆</div>' +
                    '<div style="padding-left:8px;border-left:2px solid rgba(90,159,212,0.3);margin:6px 0;">' + midTag + '<b style="color:#e8ecf2;">中频（250-4kHz）</b>：人声主力。决定清晰度与通透度，人声靠这里</div>' +
                    '<div style="padding-left:8px;border-left:2px solid rgba(90,200,150,0.3);margin:6px 0;">' + highTag + '<b style="color:#e8ecf2;">高频（4k-20kHz）</b>：高音与乐器泛音。调亮 → 清明亮丽；调低 → 柔和不刺耳</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">通俗用法（场景速查）</span></div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🎤 <b style="color:#e8ecf2;">人声难听/被伴奏盖住</b> → 拉高中频（500Hz-3kHz）</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🔊 <b style="color:#e8ecf2;">没低音/不够震撼</b> → 拉高低频（60-150Hz）</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">⚡ <b style="color:#e8ecf2;">刺耳/有金属杂音</b> → 压低高频（4-8kHz）</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🌫️ <b style="color:#e8ecf2;">声音浑浊不清晰</b> → 略降低频（200-300Hz）</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">推荐开启与使用建议</span></div>' +
                    '<div style="padding-left:8px;margin:6px 0;">✅ <b style="color:#5ac896;">默认已开启</b>（无需调整）：DC 偏移过滤、真峰值限幅器 —— 保护性功能，对所有音乐都有益无害</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">💡 <b style="color:#5a9fd4;">新手最快路径</b>：直接选「内置预设」→ 试试「极致听感」「Hi-Res 解析」「母带处理」「金属硬核」「澎湃重低音(需要搭配 线性相位 使用)」「华语流行」「声场」 </div>' +
                    '<div style="padding-left:8px;margin:6px 0;">⚙️ <b style="color:#c890d8;">进阶按需开启</b>：Dither、动态 EQ、M/S、线性相位 (有一些预设需要搭配高级功能里面的一些功能使用)—— 见「高级功能专区」</div>' +
                '</div>' +
            '</details>' +

            // === 分区 3：均衡器与音效增强详细说明 ===
            '<details style="' + detailsStyle + '">' +
                '<summary style="' + summaryStyle + '">🎚️ 均衡器与音效增强详细指南（点击此处展开-按需展开）</summary>' +
                '<div style="' + contentStyle + '">' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">31 段频率调节指南（20Hz - 20kHz）</span></div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + lowTag + '<b style="color:#e8ecf2;">20-40Hz</b>：超低频，鼓与贝斯的最低部分。+2~3dB 增加下潜感，过多会混浊</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + lowTag + '<b style="color:#e8ecf2;">40-80Hz</b>：低频基础。+2dB 让底鼓有力，-2dB 让低音干净</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + lowTag + '<b style="color:#e8ecf2;">80-200Hz</b>：低音主体。过多会"轰隆"，适度提升增加温暖感</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + lowTag + '<b style="color:#e8ecf2;">200-300Hz</b>：浑浊区。降低 1-2dB 可显著提升清晰度</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + midTag + '<b style="color:#e8ecf2;">300-500Hz</b>：低中频，"纸盒声"区域。过多像捂着音箱，降低可解闷</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + midTag + '<b style="color:#e8ecf2;">500-1kHz</b>：人声基础。提升让人声更"实"，过多会变"喇叭"声</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + midTag + '<b style="color:#e8ecf2;">1-2kHz</b>：人声主体。提升增加临场感，让歌词更清晰</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + midTag + '<b style="color:#e8ecf2;">2-4kHz</b>：人声清晰度关键区。+2dB 让人声"咬字"清楚，过多会刺耳</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + highTag + '<b style="color:#e8ecf2;">4-6kHz</b>：临场感。决定乐器"在不在面前"，过多会"扎耳"</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + highTag + '<b style="color:#e8ecf2;">6-10kHz</b>：高频亮度。+2dB 让声音"开亮"，齿音也在此区，过多会"嘶嘶"</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + highTag + '<b style="color:#e8ecf2;">10-16kHz</b>：空气感。提升让声音"通透有空气"，过亮则降低</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">' + highTag + '<b style="color:#e8ecf2;">16-20kHz</b>：极高频泛音。微调即可，影响"开扬感"</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">Q 值是什么？</span><br>Q 值决定影响的频率范围宽度。Q 大（如 4-6）→ 只影响很窄一段；Q 小（如 0.7-1）→ 影响较宽范围。新手建议保持默认 1.4。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">音效增强用法（音效增强标签页）</span></div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🔊 <b style="color:#e8ecf2;">低音增强 / 动态低音</b>：增强低频，动态低音（小音量补更多）。建议 +10-30</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🎤 <b style="color:#e8ecf2;">人声增强</b>：突出中频人声，让歌手更"近"。建议 +15-30</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">✨ <b style="color:#e8ecf2;">清晰度 / 临场感</b>：提升中高频细节，让乐器和人声更清晰。建议 +5-20</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🌈 <b style="color:#e8ecf2;">环绕声 / 混响 / 氛围</b>：扩展声场、添加空间感。建议适度，过多会"空"</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">🔊 <b style="color:#e8ecf2;">输出增益</b>：整体音量。50=不增不减，调大放大音量（注意削波）</div>' +
                    '<div style="padding-left:8px;margin:6px 0;">⚖️ <b style="color:#e8ecf2;">立体声平衡</b>：50=居中，&lt;50 偏左，&gt;50 偏右</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">小贴士</span><br>① 每次 EQ 只调 1-2 个参数，对比开关效果<br>② 增益不宜超过 ±6dB，否则容易失真<br>③ 「重置」按钮可恢复出厂设置</div>' +
                '</div>' +
            '</details>' +

            // === 分区 4：高级功能专区 ===
            '<details style="' + detailsStyle + '">' +
                '<summary style="' + summaryStyle + '">⚙️ 高级功能专区 （点击此处展开-按需展开）</summary>' +
                '<div style="' + contentStyle + '">' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">DC 偏移过滤</span> <span style="color:#5ac896;font-size:11px;">（默认开启）</span><br>高通滤波器（默认 20Hz, Q=0.707）去除直流偏移成分。直流偏移会浪费动态范围、影响后续效果器稳定性。可调截止频率（5-50Hz）和 Q 值，禁用时频率自动设为 1Hz 等同旁通。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">真峰值限幅器</span> <span style="color:#5ac896;font-size:11px;">（默认开启）</span><br>4× 过采样 WaveShaper 软限幅 + DynamicsCompressor 硬限幅兜底。防止 inter-sample peak 导致的数字削波。<b>阈值</b>（默认 -1dB）：开始限幅的点；<b>输出上限</b>（默认 -0.5dB）：硬性天花板；<b>释放时间</b>（默认 100ms）：限幅后恢复速度。阈值必须 ≤ 输出上限，UI 会自动校验。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">位深抖动 Dither</span> <span style="color:#787e8a;font-size:11px;">（默认关闭）</span><br>16bit 输出时添加 TPDF（三角概率密度）噪声降低量化失真，配合噪声整形可进一步将噪声推向高频。Web Audio 默认 float32 处理，听感差异极小，进阶用户可选。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">动态 EQ</span> <span style="color:#787e8a;font-size:11px;">（默认关闭）</span><br>实时频谱分析 + 31 段动态增益压缩。当某频段音量超过阈值时按比例衰减，避免大音量过载。<b>阈值</b>：触发点（-30dB 起步）；<b>比率</b>：压缩强度；<b>攻击/释放</b>：响应速度。适合古典、动态大的音乐。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">中侧链 (M/S)</span> <span style="color:#787e8a;font-size:11px;">（默认关闭）</span><br>将立体声拆分为 Mid（人声居中部分）和 Side（左右定位部分）独立调节 EQ。适合混音：增强 Side 让声场更宽，增强 Mid 让人声更突出。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">声道模式</span><br>立体声（默认）/ 仅左声道 / 仅右声道 / 独立声道（左右分别调 EQ）。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">线性相位</span> <span style="color:#787e8a;font-size:11px;">（默认关闭）</span><br>使用 FIR 卷积滤波实现无相位失真的 EQ 处理。优点：相位线性，瞬态准确；缺点：CPU 开销大、延迟高（几百毫秒），不适合实时监听。母带处理用。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">预设分享码</span><br>把你的调音（EQ、效果器、高级配置等）打包成一串字符（MEQ: 开头）。支持多选导出项目，朋友粘贴即可还原。版本号兼容性：v2.0 格式。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">响度补偿</span><br>人耳对小音量下高低频感知下降（等响曲线）。开启后自动补偿，让小音量也能听到完整频段。</div>' +
                '</div>' +
            '</details>' +

            // === 分区 5：常见问题 ===
            '<details open style="' + detailsStyle + '">' +
                '<summary style="' + summaryStyle + '">❓ 常见问题</summary>' +
                '<div style="' + contentStyle + '">' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">没声音？</span><br>① 检查顶部「开关EQ」是否为绿色（开启状态）<br>② 确认主程序正在播放音频<br>③ 刷新页面重试，让插件重新挂载音频元素</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">调整后没变化？</span><br>刷新重试。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">声音变炸/失真？</span><br>① 检查是否进行了过大的调节,比如:「输出增益」是否过高（建议 50-60）<br>② 检查 EQ 增益是否叠加过多（单段不超过 ±6dB）<br>③ 真峰值限幅器默认开启可防削波，确认未手动关闭</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">设置丢了？</span><br>设置自动保存到浏览器 chrome.storage.local，清除浏览器数据会丢失。重要调音请先用「分享/导入」生成分享码备份。</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">CPU 占用高/卡顿？</span><br>① 关闭「线性相位」（开销最大）<br>② 关闭「动态 EQ」（实时分析耗 CPU）<br>③ 减少同时开启的音效数量</div>' +
                    '<div style="' + itemStyle + '"><span style="' + titleStyle + '">如何分享我的调音？</span><br>顶部「分享/导入」→  需要先切换到你要分享的预设 → 勾选要分享的内容 → 生成分享码 → 复制发给朋友。对方粘贴到导入框即可还原。</div>' +
                '</div>' +
            '</details>' +

            '<div style="display:flex;justify-content:center;margin-top:16px;gap:10px;">' +
                '<button id="moekoe-help-close" style="padding:10px 36px;border:none;border-radius:8px;background:#5a9fd4;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">开始调音</button>' +
            '</div>';

        overlay.appendChild(box);
        var closeOverlay = function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeOverlay(); });
        var closeBtn = box.querySelector('#moekoe-help-close');
        if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
        document.body.appendChild(overlay);
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
window.postMessage({ source: MSG_SRC.CONTENT, type: type, data: data }, _msgTargetOrigin);
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
                else if (k === 'dcFilter') s[k] = Object.assign({}, DC_FILTER_DEFAULT);
                else if (k === 'dither') s[k] = Object.assign({}, DITHER_DEFAULT);
                else if (k === 'truePeakLimiter') s[k] = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT);
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
#moekoe-eq-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:820px;max-height:90vh;background:#1a1d22;border-radius:16px;z-index:2147483645;display:none;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#cdd6e0;overflow:hidden;border:1px solid rgba(90,159,212,0.1);}
#moekoe-eq-panel.visible{display:flex;}
.eq-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1e2127;border-bottom:1px solid rgba(90,159,212,0.08);}
.eq-header-title{font-size:16px;font-weight:600;color:#5a9fd4;}
.eq-header-actions{display:flex;gap:8px;align-items:center;}
.eq-btn{padding:6px 14px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all 0.2s;}
.eq-btn-primary{background:transparent;color:#5a9fd4;border:1px solid rgba(90,159,212,0.3);}
.eq-btn-primary:hover{background:rgba(90,159,212,0.1);border-color:#5a9fd4;}
.eq-btn-danger{background:transparent;color:#e06c75;border:1px solid rgba(224,108,117,0.3);}
.eq-btn-danger:hover{background:rgba(224,108,117,0.1);}
.eq-btn-secondary{background:transparent;color:#cdd6e0;border:1px solid rgba(90,159,212,0.15);}
.eq-btn-secondary:hover{background:rgba(90,159,212,0.08);border-color:rgba(90,159,212,0.3);}
.eq-btn-sm{padding:4px 10px;font-size:11px;}
.eq-tabs{display:flex;padding:0 20px;background:#1a1d22;border-bottom:1px solid rgba(90,159,212,0.08);}
.eq-tab{padding:10px 18px;cursor:pointer;font-size:13px;color:#787e8a;border-bottom:2px solid transparent;transition:all 0.2s;}
.eq-tab:hover{color:#cdd6e0;}
.eq-tab.active{color:#5a9fd4;border-bottom-color:#5a9fd4;}
.eq-body{flex:1;overflow-y:auto;padding:16px 20px;scrollbar-width:thin;scrollbar-color:rgba(90,159,212,0.2) transparent;}
.eq-body::-webkit-scrollbar{width:6px;}
.eq-body::-webkit-scrollbar-thumb{background:rgba(90,159,212,0.2);border-radius:3px;}
.eq-section{margin-bottom:16px;}
.eq-section-title{font-size:11px;font-weight:600;color:#787e8a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.eq-category-title{font-size:11px;font-weight:600;color:#787e8a;margin:12px 0 6px;padding:4px 8px;background:rgba(90,159,212,0.05);border-radius:4px;border-left:2px solid rgba(90,159,212,0.3);}
.eq-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.eq-label{font-size:12px;color:#787e8a;min-width:70px;}
.eq-slider-wrap{flex:1;display:flex;align-items:center;gap:8px;}
.eq-slider{-webkit-appearance:none;appearance:none;flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);outline:none;}
.eq-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#5a9fd4;cursor:pointer;box-shadow:0 0 6px rgba(90,159,212,0.4);}
.eq-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#5a9fd4;cursor:pointer;box-shadow:0 0 6px rgba(90,159,212,0.4);}
.eq-value{font-size:11px;color:#787e8a;min-width:35px;text-align:right;}
.eq-toggle{position:relative;width:36px;height:20px;background:rgba(120,126,138,0.3);border-radius:10px;cursor:pointer;transition:all 0.3s;}
.eq-toggle.active{background:rgba(90,159,212,0.5);}
.eq-toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:all 0.3s;}
.eq-toggle.active::after{left:18px;}
.eq-select{background:rgba(255,255,255,0.1);color:#cdd6e0;border:1px solid rgba(90,159,212,0.15);border-radius:6px;padding:6px 10px;font-size:12px;outline:none;cursor:pointer;}
.eq-select option{background:#1a1d22;color:#cdd6e0;}
#moekoe-eq-spectrum{width:100%;height:120px;border-radius:8px;background:rgba(0,0,0,0.3);margin-bottom:12px;}
.eq-sliders-grid{display:grid;grid-template-columns:repeat(31,1fr);gap:2px;margin-bottom:8px;}
.eq-band{display:flex;flex-direction:column;align-items:center;gap:2px;}
.eq-band input[type=range]{-webkit-appearance:none;appearance:none;width:18px;height:80px;background:transparent;writing-mode:vertical-lr;direction:rtl;}
.eq-band input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:10px;height:10px;border-radius:2px;background:#5a9fd4;cursor:pointer;box-shadow:0 0 4px rgba(90,159,212,0.3);}
.eq-band input[type=range]::-webkit-slider-runnable-track{width:4px;background:rgba(255,255,255,0.15);border-radius:2px;}
.eq-band-freq{font-size:8px;color:#5c6370;transform:rotate(-45deg);white-space:nowrap;}
.eq-band-val{font-size:8px;color:#787e8a;}
.eq-band-q{width:28px;background:rgba(255,255,255,0.08);color:#5a9fd4;border:1px solid rgba(90,159,212,0.15);border-radius:3px;font-size:9px;text-align:center;padding:1px;}
.eq-preset-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.eq-preset-btn{padding:5px 12px;border:1px solid rgba(90,159,212,0.15);border-radius:6px;background:rgba(90,159,212,0.05);color:#787e8a;cursor:pointer;font-size:11px;transition:all 0.2s;}
.eq-preset-btn:hover{background:rgba(90,159,212,0.1);color:#5a9fd4;}
.eq-preset-btn.active{background:rgba(90,159,212,0.15);border-color:rgba(90,159,212,0.4);color:#5a9fd4;font-weight:bold;}
.eq-advanced-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.eq-advanced-card{background:rgba(255,255,255,0.03);border:1px solid rgba(90,159,212,0.08);border-radius:10px;padding:14px;}
.eq-advanced-card-title{font-size:13px;font-weight:600;color:#787e8a;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.eq-status{display:flex;align-items:center;gap:6px;font-size:11px;color:#787e8a;}
.eq-status-dot{width:8px;height:8px;border-radius:50%;}
.eq-status-dot.on{background:#7ec87b;box-shadow:0 0 6px rgba(126,200,123,0.4);}
.eq-status-dot.off{background:#e06c75;}
.eq-close{width:28px;height:28px;border:none;background:rgba(255,255,255,0.1);border-radius:6px;color:#cdd6e0;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
.eq-close:hover{background:rgba(224,108,117,0.2);color:#e06c75;}
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
        <button class="eq-btn eq-btn-sm eq-btn-primary" id="eq-share-btn">分享/导入</button>
        <button class="eq-btn eq-btn-sm eq-btn-secondary" id="eq-help-btn" title="使用说明" style="font-weight:700;padding:0 8px;line-height:1;">?</button>
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
            channelIndicator = '<div style="text-align:center;font-size:12px;color:#5a9fd4;margin-bottom:8px;">当前编辑：' + (channelEditTarget === 'right' ? '右声道' : '左声道') + '</div>';
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
                '<button class="eq-preset-delete-btn" data-preset-id="' + p.id + '" title="删除预设" style="width:18px;height:18px;border:none;border-radius:4px;background:rgba(224,108,117,0.15);color:#e06c75;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;">✕</button>' +
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
            '<button class="eq-preset-btn" id="eq-save-preset-btn" style="border-color:#7ec87b;color:#7ec87b;">+ 保存预设</button>' +
            '</div></div>' +
            '<div class="eq-section">' +
            '<div class="eq-section-title">均衡器调节 <span style="font-size:10px;color:#5c6370;font-weight:400;">双击滑杆归零 | Q值可调</span></div>' +
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
            renderDitherCard(s) +
            renderTruePeakCard(s) +
            renderDCFilterCard(s) +
            '</div>';
    }

    function renderDCFilterCard(s) {
        var dc = s.dcFilter || Object.assign({}, DC_FILTER_DEFAULT);
        var cutoff = dc.cutoffFreq != null ? dc.cutoffFreq : 20;
        var q = dc.Q != null ? dc.Q : 0.707;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">DC 偏移过滤 <div class="eq-toggle' + (dc.enabled ? ' active' : '') + '" id="eq-dcfilter-toggle"></div></div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">高通滤波去除直流偏移，避免低频失真</div>' +
            '<div class="eq-row"><span class="eq-label">截止频率</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="5" max="50" step="1" value="' + cutoff + '" data-dcfilter="cutoffFreq"><span class="eq-value">' + cutoff + ' Hz</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">Q 值</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0.1" max="2" step="0.01" value="' + q + '" data-dcfilter="Q"><span class="eq-value">' + q.toFixed(2) + '</span></div></div>' +
            '</div>';
    }

    function renderDitherCard(s) {
        var d = s.dither || Object.assign({}, DITHER_DEFAULT);
        var bits = d.targetBits || 16;
        var ns = d.noiseShaping !== false;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">位深抖动 (Dither) <div class="eq-toggle' + (d.enabled ? ' active' : '') + '" id="eq-dither-toggle"></div></div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">添加 TPDF 噪声以降低量化失真，模拟低位深输出</div>' +
            '<div class="eq-row"><span class="eq-label">目标位深</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="8" max="24" step="1" value="' + bits + '" data-dither="targetBits"><span class="eq-value">' + bits + ' bit</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">噪声整形</span><div class="eq-toggle' + (ns ? ' active' : '') + '" id="eq-dither-ns-toggle"></div></div>' +
            '</div>';
    }

    function renderTruePeakCard(s) {
        var tp = s.truePeakLimiter || Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT);
        var threshold = tp.threshold != null ? tp.threshold : -1.0;
        var ceiling = tp.ceiling != null ? tp.ceiling : -0.5;
        var release = tp.release != null ? tp.release : 0.1;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">真峰值限幅器 <div class="eq-toggle' + (tp.enabled ? ' active' : '') + '" id="eq-truepeak-toggle"></div></div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">4× 过采样检测真实峰值，防止数字削波失真</div>' +
            '<div class="eq-row"><span class="eq-label">阈值</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-6" max="0" step="0.1" value="' + threshold + '" data-truepeak="threshold"><span class="eq-value">' + threshold.toFixed(1) + ' dB</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">输出上限</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-3" max="0" step="0.1" value="' + ceiling + '" data-truepeak="ceiling"><span class="eq-value">' + ceiling.toFixed(1) + ' dB</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">释放时间</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0.01" max="0.5" step="0.01" value="' + release + '" data-truepeak="release"><span class="eq-value">' + (release * 1000).toFixed(0) + ' ms</span></div></div>' +
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
                '<div style="font-size:11px;color:#787e8a;margin-bottom:6px;">选择在均衡器标签页中编辑的声道</div>' +
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
        var midGains = s.midGains || Array(31).fill(0);
        var sideGains = s.sideGains || Array(31).fill(0);
        var midAvg = 0, sideAvg = 0;
        for (var i = 0; i < 31; i++) { midAvg += midGains[i]; sideAvg += sideGains[i]; }
        midAvg = Math.round(midAvg / 31 * 2) / 2;
        sideAvg = Math.round(sideAvg / 31 * 2) / 2;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">Mid/Side处理 <div class="eq-toggle' + (s.midSideEnabled ? ' active' : '') + '" id="eq-mid-side-toggle"></div></div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">独立调节中间声道（人声）和侧边声道（宽度）</div>' +
            '<div class="eq-row"><span class="eq-label">Mid增益</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-6" max="6" step="0.5" value="' + midAvg + '" data-ms="mid-boost"><span class="eq-value">' + midAvg + 'dB</span></div></div>' +
            '<div class="eq-row"><span class="eq-label">Side增益</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="-6" max="6" step="0.5" value="' + sideAvg + '" data-ms="side-boost"><span class="eq-value">' + sideAvg + 'dB</span></div></div>' +
            '</div>';
    }

    function renderLinearPhaseCard(s) {
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">线性相位 <div class="eq-toggle' + (s.linearPhaseEnabled ? ' active' : '') + '" id="eq-linear-phase-toggle"></div></div>' +
            '<div style="font-size:11px;color:#787e8a;">使用FIR滤波器实现零相位偏移，延迟略高但音质更纯净</div>' +
            '</div>';
    }

    function renderLoudnessCard(s) {
        var val = (s.effects && s.effects.loudnessCompensation) || 0;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">响度补偿 (Fletcher-Munson)</div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">低音量时自动提升低频和高频，补偿人耳感知衰减</div>' +
            '<div class="eq-row"><span class="eq-label">补偿量</span><div class="eq-slider-wrap"><input type="range" class="eq-slider" min="0" max="100" value="' + val + '" data-effect="loudnessCompensation"><span class="eq-value">' + val + '</span></div></div>' +
            '</div>';
    }

    function renderReferenceCard(s) {
        var hasRef = s.referenceProfile !== null;
        return '<div class="eq-advanced-card">' +
            '<div class="eq-advanced-card-title">参考曲目匹配</div>' +
            '<div style="font-size:11px;color:#787e8a;margin-bottom:8px;">捕获当前曲目频响作为参考，后续曲目自动匹配</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="eq-btn eq-btn-sm eq-btn-primary" id="eq-capture-ref-btn">捕获参考</button>' +
            '<button class="eq-btn eq-btn-sm eq-btn-secondary" id="eq-match-ref-btn"' + (hasRef ? '' : ' disabled') + '>匹配参考</button>' +
            '<button class="eq-btn eq-btn-sm eq-btn-danger" id="eq-clear-ref-btn"' + (hasRef ? '' : ' style="display:none;"') + '>清除参考</button>' +
            '<span style="font-size:11px;color:#5c6370;align-self:center;" id="eq-ref-status">' + (hasRef ? '已有参考' : '无参考') + '</span>' +
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
        $id('eq-share-btn').addEventListener('click', function() {
            showShareDialog();
        });
        var helpBtn = $id('eq-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', function() {
                showHelpDialog();
            });
        }

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
                var isInd = currentSettings && currentSettings.channelMode === 'independent';
                if (isInd) {
                    if (channelEditTarget === 'right') {
                        if (currentSettings) currentSettings.rightQValues[idx] = val;
                        sendToMain('set-q-value', { index: idx, q: val });
                    } else {
                        if (currentSettings) currentSettings.leftQValues[idx] = val;
                        sendToMain('set-q-value', { index: idx, q: val });
                    }
                } else {
                    if (currentSettings) currentSettings.qValues[idx] = val;
                    sendToMain('set-q-value', { index: idx, q: val });
                }
                debounce('save-q', function() { saveSettingsToStorage(currentSettings); }, 300);
            });
        });

        panel.querySelectorAll('.eq-preset-btn[data-preset]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var presetName = this.dataset.preset;
                var presetData = this.dataset.presetData ? JSON.parse(this.dataset.presetData) : null;
                if (currentSettings) {
                    currentSettings.preset = presetName;
                    var p = presetData || EQ_PRESETS[presetName];
                    if (p && p.gains) currentSettings.gains = p.gains.slice();
                    if (p && p.effects) {
                        currentSettings.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, p.effects);
                        currentSettings.effectsEnabled = true;
                    }
                }
                lastPresetChangeTime = Date.now();
                renderTabContent();
                sendToMain('apply-preset', { preset: presetName, presetData: presetData });
                safeRuntimeMessage({
                    action: 'apply-preset',
                    preset: presetName,
                    presetData: presetData
                });
                showToast('已应用: ' + (presetData ? presetData.name : (EQ_PRESETS[presetName] ? EQ_PRESETS[presetName].name : presetName)));
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

        // === Dither 控件 ===
        var ditherToggle = $id('eq-dither-toggle');
        if (ditherToggle) {
            ditherToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                var dither = currentSettings ? Object.assign({}, currentSettings.dither) : Object.assign({}, DITHER_DEFAULT);
                dither.enabled = isActive;
                if (currentSettings) currentSettings.dither = dither;
                sendToMain('set-dither', { dither: dither });
                saveSettingsToStorage(currentSettings);
            });
        }
        var ditherNsToggle = $id('eq-dither-ns-toggle');
        if (ditherNsToggle) {
            ditherNsToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                var dither = currentSettings ? Object.assign({}, currentSettings.dither) : Object.assign({}, DITHER_DEFAULT);
                dither.noiseShaping = isActive;
                if (currentSettings) currentSettings.dither = dither;
                sendToMain('set-dither', { dither: dither });
                saveSettingsToStorage(currentSettings);
            });
        }
        panel.querySelectorAll('.eq-slider[data-dither]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var param = this.dataset.dither;
                var val = parseInt(this.value, 10);
                var dither = currentSettings ? Object.assign({}, currentSettings.dither) : Object.assign({}, DITHER_DEFAULT);
                dither[param] = val;
                if (currentSettings) currentSettings.dither = dither;
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) valSpan.textContent = val + ' bit';
                debounce('save-dither', function() {
                    sendToMain('set-dither', { dither: dither });
                    saveSettingsToStorage(currentSettings);
                }, 200);
            });
        });

        // === DC 偏移过滤控件 ===
        var dcFilterToggle = $id('eq-dcfilter-toggle');
        if (dcFilterToggle) {
            dcFilterToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                var dc = Object.assign({}, DC_FILTER_DEFAULT, currentSettings ? currentSettings.dcFilter : null);
                dc.enabled = isActive;
                if (currentSettings) currentSettings.dcFilter = dc;
                sendToMain('set-dc-filter', { dcFilter: dc });
                saveSettingsToStorage(currentSettings);
            });
        }
        panel.querySelectorAll('.eq-slider[data-dcfilter]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var param = this.dataset.dcfilter;
                var val = parseFloat(this.value);
                var dc = Object.assign({}, DC_FILTER_DEFAULT, currentSettings ? currentSettings.dcFilter : null);
                dc[param] = val;
                if (currentSettings) currentSettings.dcFilter = dc;
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) {
                    if (param === 'cutoffFreq') valSpan.textContent = val + ' Hz';
                    else if (param === 'Q') valSpan.textContent = val.toFixed(2);
                }
                debounce('save-dcfilter', function() {
                    sendToMain('set-dc-filter', { dcFilter: dc });
                    saveSettingsToStorage(currentSettings);
                }, 200);
            });
        });

        // === 真峰值限幅器控件 ===
        var truePeakToggle = $id('eq-truepeak-toggle');
        if (truePeakToggle) {
            truePeakToggle.addEventListener('click', function() {
                var isActive = this.classList.toggle('active');
                var tp = currentSettings ? Object.assign({}, currentSettings.truePeakLimiter) : Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT);
                tp.enabled = isActive;
                if (currentSettings) currentSettings.truePeakLimiter = tp;
                sendToMain('set-true-peak', { truePeakLimiter: tp });
                saveSettingsToStorage(currentSettings);
            });
        }
        panel.querySelectorAll('.eq-slider[data-truepeak]').forEach(function(slider) {
            slider.addEventListener('input', function() {
                var param = this.dataset.truepeak;
                var val = parseFloat(this.value);
                var tp = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT, currentSettings ? currentSettings.truePeakLimiter : null);
                tp[param] = val;
                // 阈值校验：threshold 必须 <= ceiling，否则自动调整对方
                if (param === 'threshold' && tp.ceiling != null && val > tp.ceiling) {
                    tp.ceiling = val;
                    var ceilingSlider = panel.querySelector('.eq-slider[data-truepeak="ceiling"]');
                    if (ceilingSlider) {
                        ceilingSlider.value = val;
                        var ceilingSpan = ceilingSlider.parentElement.querySelector('.eq-value');
                        if (ceilingSpan) ceilingSpan.textContent = val.toFixed(1) + ' dB';
                    }
                } else if (param === 'ceiling' && tp.threshold != null && val < tp.threshold) {
                    tp.threshold = val;
                    var thresholdSlider = panel.querySelector('.eq-slider[data-truepeak="threshold"]');
                    if (thresholdSlider) {
                        thresholdSlider.value = val;
                        var thresholdSpan = thresholdSlider.parentElement.querySelector('.eq-value');
                        if (thresholdSpan) thresholdSpan.textContent = val.toFixed(1) + ' dB';
                    }
                }
                if (currentSettings) currentSettings.truePeakLimiter = tp;
                var valSpan = this.parentElement.querySelector('.eq-value');
                if (valSpan) {
                    if (param === 'release') {
                        valSpan.textContent = (val * 1000).toFixed(0) + ' ms';
                    } else {
                        valSpan.textContent = val.toFixed(1) + ' dB';
                    }
                }
                debounce('save-truepeak', function() {
                    sendToMain('set-true-peak', { truePeakLimiter: tp });
                    saveSettingsToStorage(currentSettings);
                }, 200);
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
    var spectrumFrameCounter = 0;
    function startSpectrumLoop() {
        isSpectrumActive = true;
        function draw() {
            if (!isSpectrumActive || !spectrumCanvas || !isPanelOpen) {
                isSpectrumActive = false;
                return;
            }
            if (lastSpectrumData) drawSpectrum(lastSpectrumData);
            spectrumFrameCounter++;
            if (spectrumFrameCounter % 2 === 0) {
                sendToMain('get-spectrum', {});
            }
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

        spectrumCtx.fillStyle = 'rgba(90,159,212,0.2)';
        for (var i = 0; i < barCount; i++) {
            var fLow = Math.pow(10, logMin + (logMax - logMin) * i / barCount);
            var fHigh = Math.pow(10, logMin + (logMax - logMin) * (i + 1) / barCount);
            var binLow = Math.round(fLow / nyquist * binCount);
            var binHigh = Math.round(fHigh / nyquist * binCount);
            var val = getAvgValue(input, binLow, binHigh);
            var barH = val * h;
            spectrumCtx.fillRect(i * (barWidth + 1), h - barH, barWidth, barH);
        }

        spectrumCtx.fillStyle = 'rgba(90,159,212,0.5)';
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
            spectrumCtx.strokeStyle = 'rgba(126,200,123,0.8)';
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
        panelOpenTime = Date.now();
        panel.classList.add('visible');
        if (eqButton) eqButton.classList.add('moekoe-eq-btn-active');
        loadSettingsFromStorage().then(function() {
            renderTabContent();
            updateStatus();
        });
        // 首次安装或更新后弹出引导卡片
        setTimeout(checkFirstRunOrUpdate, 500);
    }

    function closePanel() {
        if (panel) panel.classList.remove('visible');
        isPanelOpen = false;
        isSpectrumActive = false;
        if (spectrumAnimId) { cancelAnimationFrame(spectrumAnimId); spectrumAnimId = null; }
        if (eqButton) eqButton.classList.remove('moekoe-eq-btn-active');
    }

    var eqBtnStyleInjected = false;

    function injectEQButtonStyles() {
        if (eqBtnStyleInjected) return;
        var style = document.createElement('style');
        style.id = 'moekoe-eq-btn-styles';
        style.textContent = '.moekoe-eq-btn{position:relative;transition:color 0.2s ease,background 0.2s ease;cursor:pointer;background:transparent !important;border:none !important;padding:8px !important;display:flex !important;align-items:center !important;justify-content:center !important;color:#999;outline:none !important;box-shadow:none !important;}.moekoe-eq-btn:hover{color:#5a9fd4 !important;background:transparent !important;}.moekoe-eq-btn-active{color:#5a9fd4 !important;background:transparent !important;}.moekoe-eq-btn-active::after{content:"";position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:4px;height:3px;border-radius:2px;background:#5a9fd4;}';
        document.head.appendChild(style);
        eqBtnStyleInjected = true;
    }

    function injectEQButton() {
        var extraControls = document.querySelector('.extra-controls');
        if (!extraControls || document.getElementById('moekoe-eq-btn')) return;

        injectEQButtonStyles();

        var btn = document.createElement('button');
        btn.id = 'moekoe-eq-btn';
        btn.className = 'extra-btn moekoe-eq-btn';
        btn.title = '均衡器';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="10" width="3" height="8" rx="1" fill="currentColor"/><rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor"/><rect x="12" y="3" width="3" height="15" rx="1" fill="currentColor"/><rect x="17" y="8" width="3" height="10" rx="1" fill="currentColor"/></svg>';
        btn.addEventListener('click', function(e) { e.stopPropagation(); if (isPanelOpen) closePanel(); else openPanel(); });

        var speedBtn = extraControls.querySelector('.playback-speed');
        if (speedBtn && speedBtn.nextSibling) {
            extraControls.insertBefore(btn, speedBtn.nextSibling);
        } else {
            extraControls.appendChild(btn);
        }
        eqButton = btn;
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
                        var incoming = data.data;
                        var base = currentSettings || buildDefaultSettingsLocal();
                        var merged = Object.assign({}, base, incoming);
                        var arrayKeys = ['gains', 'qValues', 'leftGains', 'rightGains', 'leftQValues', 'rightQValues', 'midGains', 'sideGains'];
                        for (var ai = 0; ai < arrayKeys.length; ai++) {
                            var key = arrayKeys[ai];
                            if (incoming[key] && Array.isArray(incoming[key])) {
                                merged[key] = incoming[key].slice();
                            }
                        }
                        if (incoming.effects && typeof incoming.effects === 'object') {
                            merged.effects = Object.assign({}, base.effects || AUDIO_EFFECTS_DEFAULT, incoming.effects);
                        }
                        if (incoming.dynamicEQ && typeof incoming.dynamicEQ === 'object') {
                            merged.dynamicEQ = Object.assign({}, base.dynamicEQ || DYNAMIC_EQ_DEFAULT, incoming.dynamicEQ);
                        }
                        if (incoming.dither && typeof incoming.dither === 'object') {
                            merged.dither = Object.assign({}, DITHER_DEFAULT, incoming.dither);
                        }
                        if (incoming.dcFilter && typeof incoming.dcFilter === 'object') {
                            merged.dcFilter = Object.assign({}, DC_FILTER_DEFAULT, incoming.dcFilter);
                        }
                        if (incoming.truePeakLimiter && typeof incoming.truePeakLimiter === 'object') {
                            merged.truePeakLimiter = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT, incoming.truePeakLimiter);
                        }
                        var isWithinGracePeriod = Date.now() - panelOpenTime < PANEL_LOAD_GRACE_PERIOD;
                        var recentlyChanged = Date.now() - lastPresetChangeTime < 1000;
                        if ((isWithinGracePeriod || recentlyChanged) && base.preset && incoming.preset && incoming.preset !== base.preset) {
                            merged.preset = base.preset;
                            if (EQ_PRESETS[base.preset] || base.preset.startsWith('custom_')) {
                                var p = EQ_PRESETS[base.preset];
                                if (p && p.gains) merged.gains = p.gains.slice();
                            }
                        }
                        currentSettings = merged;
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
                case 'compatibility-warning':
                    if (data.data && data.data.message) {
                        showToast(data.data.message);
                    }
                    break;
                case 'capture-reference-complete':
                    if (data.data && data.data.success === false) {
                        showToast('捕获失败：' + (data.data.error === 'no_valid_audio' ? '未检测到有效音频' : '未知错误'));
                        var capBtn2 = $id('eq-capture-ref-btn');
                        if (capBtn2) capBtn2.disabled = false;
                    } else {
                        showToast('已捕获参考频响');
                        var capBtn = $id('eq-capture-ref-btn');
                        if (capBtn) capBtn.disabled = false;
                        var statusEl = $id('eq-ref-status');
                        if (statusEl) statusEl.textContent = '已有参考';
                        var mBtn = $id('eq-match-ref-btn');
                        if (mBtn) mBtn.disabled = false;
                        var clrBtn = $id('eq-clear-ref-btn');
                        if (clrBtn) clrBtn.style.display = '';
                    }
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
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e2127;border:1px solid rgba(224,108,117,0.3);color:#e06c75;padding:12px 24px;border-radius:8px;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;';
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
                lastPresetChangeTime = Date.now();
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
            case 'open-panel':
                // 由 popup 通过 background 转发，避免 Electron 独立窗口中 popup 无法直接定位主窗口 tab
                openPanel();
                break;
        }
        return true;
    });
        } catch (e) {
            console.warn('[MoeKoeEQ-CT] Runtime listener error:', e);
        }
    }

    function isDesktopLyricsWindow() {
        var hash = window.location.hash || '';
        if (hash.indexOf('lyrics') >= 0 || hash.indexOf('Lyrics') >= 0) return true;
        var pathname = window.location.pathname || '';
        if (pathname.indexOf('/lyrics') >= 0) return true;
        if (document.title && (document.title.indexOf('歌词') >= 0 || document.title.toLowerCase().indexOf('lyrics') >= 0)) return true;
        return false;
    }

    function init() {
        if (isDesktopLyricsWindow()) {
            console.log('[MoeKoeEQ-CT] Desktop lyrics window detected, skipping EQ UI initialization');
            return;
        }

        setupRuntimeListener();

        setTimeout(function() { injectEQButton(); }, 1000);
        var eqBtnObserverTimer = null;
        var eqBtnObserver = new MutationObserver(function() {
            if (eqBtnObserverTimer) clearTimeout(eqBtnObserverTimer);
            eqBtnObserverTimer = setTimeout(function() {
                if (!document.getElementById('moekoe-eq-btn')) injectEQButton();
            }, 500);
        });
        eqBtnObserver.observe(document.body, { childList: true, subtree: true });

        loadSettingsFromStorage().then(function(settings) {
            if (settings.pluginDisabled) {
                if (eqButton) eqButton.style.display = 'none';
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
        openPanel: openPanel,
        closePanel: closePanel,
        showPanel: openPanel
    };
})();
