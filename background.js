try { importScripts('shared/constants.js'); } catch (e) {
    console.warn('[MoeKoeEQ-BG] importScripts failed, using inline constants');
    var EQ_FREQUENCIES = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
    var EQ_PRESETS = { flat:{name:'平坦',gains:Array(31).fill(0)}, rock:{name:'摇滚',gains:[3,3,2,2,1,0,-1,-1,0,1,2,3,4,4,3,2,1,0,0,1,2,3,4,4,3,2,1,0,-1,-1,0]}, classical:{name:'古典',gains:[4,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,4,4]}, pop:{name:'流行',gains:[-1,0,0,1,2,3,4,4,3,2,1,0,0,0,0,0,0,0,0,0,1,2,3,3,2,1,0,0,-1,-1,-1]}, jazz:{name:'爵士',gains:[2,2,1,0,0,0,0,0,0,1,2,3,3,2,1,0,0,0,0,0,0,0,1,2,3,3,2,1,0,0,0]}, bass:{name:'低音增强',gains:[4,4,3,3,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}, treble:{name:'高音增强',gains:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,4,4,4]}, vocal:{name:'人声',gains:[-2,-1,0,0,1,2,3,4,4,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-2,-2,-2]}, fengxue:{name:'仿：风雪调音',gains:[3,3,3,3,3,3,2,2,2,2,1,1,1,2,2,2,2,1,0,-1,1,0,0,1,-2,0,-1,-1,1,2,1],effects:{clarity:4,ambiance:2,surround:2,dynamicEnhance:8,dynamicBass:3}}, ultimate:{name:'极致听感',gains:[2,2,2,2,3,3,3,2,2,1,1,1,0,0,0,0,0,0,0,-1,-1,0,0,1,1,1,1,2,2,2,2],effects:{clarity:5,ambiance:3,surround:3,dynamicEnhance:10,dynamicBass:5,warmth:3,presence:2}}, harmankardon:{name:'醇美空间',gains:[2,2,3,3,3,3,2,2,1,1,0,0,-1,-1,-1,0,0,1,1,2,2,2,3,3,2,1,1,1,1,1,1],effects:{clarity:4,ambiance:4,surround:5,dynamicEnhance:6,dynamicBass:4}}, harmanTarget:{name:'殿堂·哈基米曲线',gains:[4,4,3,3,2,2,1,1,0,0,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,1,1,2,2,3,4,4,5,5],effects:{harmonicExciter:15,tubeSaturation:10,crossfeed:20,loudnessMaximizer:10,clarity:3,warmth:2}}, studioReference:{name:'殿堂·母带处理',gains:[2,2,1,1,0,0,-1,-1,-1,0,0,0,0,0,0,0,1,1,1,2,2,2,1,1,0,0,0,1,2,2,2],effects:{multibandComp:20,harmonicExciter:12,stereoWidener:10,loudnessMaximizer:15,deEsser:8,clarity:4,presence:3}}, vinylWarmth:{name:'殿堂·黑胶温暖',gains:[3,3,3,2,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-2,-2,-3,-3,-4,-4],effects:{tubeSaturation:25,tapeEmulation:20,harmonicExciter:10,subHarmonic:15,warmth:5,dynamicBass:3}}, hiResDetail:{name:'殿堂·Hi-Res解析',gains:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,2,2,2,3,3,2,2,3,3,3,3],effects:{harmonicExciter:20,stereoWidener:15,deEsser:10,clarity:5,presence:3,loudnessMaximizer:8}} };
    var AUDIO_EFFECTS_DEFAULT = {bassBoost:0,dynamicBass:0,warmth:0,vocalEnhance:0,presence:0,clarity:0,trebleBoost:0,dynamicEnhance:0,ambiance:0,surround:0,reverb:0,outputGain:50,stereoBalance:50,loudnessCompensation:0,harmonicExciter:0,crossfeed:0,subHarmonic:0,tubeSaturation:0,multibandComp:0,deEsser:0,stereoWidener:0,tapeEmulation:0,loudnessMaximizer:0};
    var DYNAMIC_EQ_DEFAULT = {enabled:false,threshold:-30,ratio:6,attack:0.02,release:0.15};
    var LIMITER_DEFAULT = {threshold:-3,knee:10,ratio:8,attack:0.005,release:0.5};
    var DEFAULT_SETTINGS = {enabled:true,gains:Array(31).fill(0),qValues:Array(31).fill(1.4),preset:'flat',pluginDisabled:false,effects:null,effectsEnabled:true,channelMode:'stereo',leftGains:Array(31).fill(0),rightGains:Array(31).fill(0),leftQValues:Array(31).fill(1.4),rightQValues:Array(31).fill(1.4),dynamicEQ:null,midSideEnabled:false,midGains:Array(31).fill(0),sideGains:Array(31).fill(0),linearPhaseEnabled:false,referenceProfile:null};
    var MSG_SRC = {CONTENT:'__moekoe_eq_content__',MAIN:'__moekoe_eq_main__',BACKGROUND:'__moekoe_eq_background__',POPUP:'__moekoe_eq_popup__'};
    var STORAGE_KEYS = {SETTINGS:'eqSettings',CUSTOM_PRESETS:'eqCustomPresets'};
    var Q_VALUE_DEFAULT = 1.4;
    var CHANNEL_MODES = ['stereo','left','right','independent'];
}

function buildDefaultSettings() {
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

async function getSettings() {
    try {
        var result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        var settings = result[STORAGE_KEYS.SETTINGS];
        if (!settings || typeof settings !== 'object') return buildDefaultSettings();

        var def = buildDefaultSettings();
        def.enabled = settings.enabled !== undefined ? settings.enabled : def.enabled;
        def.gains = Array.isArray(settings.gains) && settings.gains.length === 31 ? settings.gains : def.gains;
        def.qValues = Array.isArray(settings.qValues) && settings.qValues.length === 31 ? settings.qValues : def.qValues;
        def.preset = settings.preset || def.preset;
        def.pluginDisabled = settings.pluginDisabled !== undefined ? settings.pluginDisabled : def.pluginDisabled;
        def.effects = settings.effects ? Object.assign({}, AUDIO_EFFECTS_DEFAULT, settings.effects) : Object.assign({}, AUDIO_EFFECTS_DEFAULT);
        def.effectsEnabled = settings.effectsEnabled !== undefined ? settings.effectsEnabled : def.effectsEnabled;
        def.channelMode = CHANNEL_MODES.indexOf(settings.channelMode) >= 0 ? settings.channelMode : def.channelMode;
        def.leftGains = Array.isArray(settings.leftGains) && settings.leftGains.length === 31 ? settings.leftGains : def.leftGains;
        def.rightGains = Array.isArray(settings.rightGains) && settings.rightGains.length === 31 ? settings.rightGains : def.rightGains;
        def.leftQValues = Array.isArray(settings.leftQValues) && settings.leftQValues.length === 31 ? settings.leftQValues : def.leftQValues;
        def.rightQValues = Array.isArray(settings.rightQValues) && settings.rightQValues.length === 31 ? settings.rightQValues : def.rightQValues;
        def.dynamicEQ = settings.dynamicEQ ? Object.assign({}, DYNAMIC_EQ_DEFAULT, settings.dynamicEQ) : Object.assign({}, DYNAMIC_EQ_DEFAULT);
        def.midSideEnabled = settings.midSideEnabled || false;
        def.midGains = Array.isArray(settings.midGains) && settings.midGains.length === 31 ? settings.midGains : def.midGains;
        def.sideGains = Array.isArray(settings.sideGains) && settings.sideGains.length === 31 ? settings.sideGains : def.sideGains;
        def.linearPhaseEnabled = settings.linearPhaseEnabled || false;
        def.referenceProfile = settings.referenceProfile || null;

        var presetsResult = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_PRESETS);
        def.customPresets = presetsResult[STORAGE_KEYS.CUSTOM_PRESETS] || [];

        return def;
    } catch (error) {
        console.error('[MoeKoeEQ-BG] getSettings error:', error);
        return buildDefaultSettings();
    }
}

async function saveSettings(settings) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    } catch (error) {
        console.error('[MoeKoeEQ-BG] saveSettings error:', error);
    }
}

async function getCustomPresets() {
    try {
        var result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_PRESETS);
        return result[STORAGE_KEYS.CUSTOM_PRESETS] || [];
    } catch (error) {
        console.error('[MoeKoeEQ-BG] getCustomPresets error:', error);
        return [];
    }
}

async function saveCustomPresets(presets) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_PRESETS]: presets });
    } catch (error) {
        console.error('[MoeKoeEQ-BG] saveCustomPresets error:', error);
    }
}

async function migrateFromLocalStorage() {
    try {
        var result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        if (result[STORAGE_KEYS.SETTINGS]) return;

        if (typeof localStorage !== 'undefined') {
            var oldSettings = localStorage.getItem('__moekoe_eq_settings');
            if (oldSettings) {
                var parsed = JSON.parse(oldSettings);
                await saveSettings(parsed);
                localStorage.removeItem('__moekoe_eq_settings');
            }

            var oldCustom = localStorage.getItem('__moekoe_eq_custom_presets');
            if (oldCustom) {
                var parsedCustom = JSON.parse(oldCustom);
                await saveCustomPresets(parsedCustom);
                localStorage.removeItem('__moekoe_eq_custom_presets');
            }
        }
    } catch (e) {
        console.error('[MoeKoeEQ-BG] Migration error:', e);
    }
}

async function broadcastMessage(message) {
    var tabs = await chrome.tabs.query({});
    for (var i = 0; i < tabs.length; i++) {
        try {
            await chrome.tabs.sendMessage(tabs[i].id, message);
        } catch (e) { /* ignore */ }
    }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    var handleMessage = async function() {
        try {
            switch (message.action) {
                case 'get-settings':
                    return { success: true, settings: await getSettings() };

                case 'save-settings':
                    await saveSettings(message.settings);
                    return { success: true };

                case 'toggle-eq': {
                    var s = await getSettings();
                    s.enabled = message.enabled;
                    await saveSettings(s);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'toggle-eq', data: { enabled: message.enabled } });
                    return { success: true };
                }

                case 'toggle-plugin-disabled': {
                    var s2 = await getSettings();
                    s2.pluginDisabled = message.disabled;
                    await saveSettings(s2);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'toggle-plugin-disabled', data: { disabled: message.disabled } });
                    return { success: true };
                }

                case 'reset-plugin': {
                    await saveSettings(buildDefaultSettings());
                    await saveCustomPresets([]);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'reset-plugin' });
                    return { success: true };
                }

                case 'reset-eq': {
                    var s3 = await getSettings();
                    s3.preset = 'flat';
                    s3.gains = Array(31).fill(0);
                    s3.qValues = Array(31).fill(Q_VALUE_DEFAULT);
                    s3.leftGains = Array(31).fill(0);
                    s3.rightGains = Array(31).fill(0);
                    s3.midGains = Array(31).fill(0);
                    s3.sideGains = Array(31).fill(0);
                    await saveSettings(s3);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'reset-eq' });
                    return { success: true };
                }

                case 'apply-preset': {
                    var s4 = await getSettings();
                    var preset = null;
                    if (message.presetData) {
                        preset = message.presetData;
                    } else if (EQ_PRESETS[message.preset]) {
                        preset = EQ_PRESETS[message.preset];
                    }
                    if (preset) {
                        s4.preset = message.preset;
                        s4.gains = preset.gains.slice();
                        if (preset.qValues && Array.isArray(preset.qValues) && preset.qValues.length === 31) {
                            s4.qValues = preset.qValues.slice();
                        }
                        if (preset.effects) {
                            s4.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, preset.effects);
                            s4.effectsEnabled = true;
                        }
                        await saveSettings(s4);
                        await broadcastMessage({
                            source: MSG_SRC.BACKGROUND,
                            type: 'apply-preset',
                            data: { preset: message.preset, gains: preset.gains, effects: preset.effects || null, presetData: preset }
                        });
                        return { success: true };
                    }
                    return { success: false, error: 'Unknown preset' };
                }

                case 'get-presets':
                    return { success: true, presets: EQ_PRESETS };

                case 'get-frequencies':
                    return { success: true, frequencies: EQ_FREQUENCIES };

                case 'set-effect': {
                    var s5 = await getSettings();
                    if (!s5.effects) s5.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
                    s5.effects[message.effect] = message.value;
                    await saveSettings(s5);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'set-effect', data: { effect: message.effect, value: message.value } });
                    return { success: true };
                }

                case 'toggle-effects': {
                    var s6 = await getSettings();
                    s6.effectsEnabled = message.enabled;
                    await saveSettings(s6);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'toggle-effects', data: { enabled: message.enabled } });
                    return { success: true };
                }

                case 'reset-effects': {
                    var s7 = await getSettings();
                    s7.effects = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
                    await saveSettings(s7);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'reset-effects' });
                    return { success: true };
                }

                case 'get-custom-presets':
                    return { success: true, presets: await getCustomPresets() };

                case 'save-custom-preset': {
                    var presets = await getCustomPresets();
                    presets.push(message.preset);
                    await saveCustomPresets(presets);
                    return { success: true };
                }

                case 'update-custom-preset': {
                    var presets2 = await getCustomPresets();
                    var idx = presets2.findIndex(function(p) { return p.id === message.preset.id; });
                    if (idx >= 0) {
                        presets2[idx] = message.preset;
                        await saveCustomPresets(presets2);
                    }
                    return { success: true };
                }

                case 'delete-custom-preset': {
                    var presets3 = await getCustomPresets();
                    presets3 = presets3.filter(function(p) { return p.id !== message.presetId; });
                    await saveCustomPresets(presets3);
                    return { success: true };
                }

                case 'set-channel-mode': {
                    var s8 = await getSettings();
                    s8.channelMode = message.channelMode;
                    await saveSettings(s8);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'set-channel-mode', data: { channelMode: message.channelMode } });
                    return { success: true };
                }

                case 'set-dynamic-eq': {
                    var s9 = await getSettings();
                    s9.dynamicEQ = Object.assign({}, DYNAMIC_EQ_DEFAULT, message.dynamicEQ);
                    await saveSettings(s9);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'set-dynamic-eq', data: { dynamicEQ: s9.dynamicEQ } });
                    return { success: true };
                }

                case 'toggle-mid-side': {
                    var s10 = await getSettings();
                    s10.midSideEnabled = message.enabled;
                    await saveSettings(s10);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'toggle-mid-side', data: { enabled: message.enabled } });
                    return { success: true };
                }

                case 'toggle-linear-phase': {
                    var s11 = await getSettings();
                    s11.linearPhaseEnabled = message.enabled;
                    await saveSettings(s11);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'toggle-linear-phase', data: { enabled: message.enabled } });
                    return { success: true };
                }

                case 'set-q-values': {
                    var s12 = await getSettings();
                    s12.qValues = message.qValues;
                    await saveSettings(s12);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'set-q-values', data: { qValues: message.qValues } });
                    return { success: true };
                }

                case 'set-reference-profile': {
                    var s13 = await getSettings();
                    s13.referenceProfile = message.profile;
                    await saveSettings(s13);
                    await broadcastMessage({ source: MSG_SRC.BACKGROUND, type: 'set-reference-profile', data: { profile: message.profile } });
                    return { success: true };
                }

                default:
                    return { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            console.error('[MoeKoeEQ-BG] handleMessage error:', error);
            return { success: false, error: error.message };
        }
    };

    handleMessage().then(sendResponse);
    return true;
});

chrome.runtime.onInstalled.addListener(async function() {
    await migrateFromLocalStorage();
    var existing = await getSettings();
    if (!existing || Object.keys(existing).length === 0) {
        await saveSettings(buildDefaultSettings());
    }
});

chrome.runtime.onStartup.addListener(async function() {
});
