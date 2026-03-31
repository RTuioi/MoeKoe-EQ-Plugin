const AUDIO_EFFECTS_DEFAULT = {
    bassBoost: 0,
    dynamicBass: 0,
    warmth: 0,
    vocalEnhance: 0,
    presence: 0,
    clarity: 0,
    trebleBoost: 0,
    dynamicEnhance: 0,
    ambiance: 0,
    surround: 0,
    reverb: 0,
    outputGain: 50,
    stereoBalance: 50
};

const DEFAULT_SETTINGS = {
    enabled: true,
    gains: Array(31).fill(0),
    preset: 'flat',
    pluginDisabled: false,
    effects: { ...AUDIO_EFFECTS_DEFAULT },
    effectsEnabled: true
};

const EQ_FREQUENCIES = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
    200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
    2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

const EQ_PRESETS = {
    flat: { name: '平坦', gains: Array(31).fill(0) },
    rock: { name: '摇滚', gains: [3, 3, 2, 2, 1, 0, -1, -1, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, -1, -1, 0] },
    classical: { name: '古典', gains: [4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 4] },
    pop: { name: '流行', gains: [-1, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, -1, -1, -1] },
    jazz: { name: '爵士', gains: [2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0] },
    bass: { name: '低音增强', gains: [4, 4, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    treble: { name: '高音增强', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 4, 4] },
    vocal: { name: '人声', gains: [-2, -1, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -2, -2] },
    fengxue: {
        name: '仿：风雪调音',
        gains: [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 1, 0, -1, 1, 0, 0, 1, -2, 0, -1, -1, 1, 2, 1],
        effects: { clarity: 4, ambiance: 2, surround: 2, dynamicEnhance: 8, dynamicBass: 3 }
    },
    ultimate: {
        name: '极致听感',
        gains: [2, 2, 2, 2, 3, 3, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2],
        effects: { clarity: 5, ambiance: 3, surround: 3, dynamicEnhance: 10, dynamicBass: 5, warmth: 3, presence: 2 }
    },
    harmankardon: {
        name: '醇美空间',
        gains: [2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -1, 0, 0, 1, 1, 2, 2, 2, 3, 3, 2, 1, 1, 1, 1, 1, 1],
        effects: { clarity: 4, ambiance: 4, surround: 5, dynamicEnhance: 6, dynamicBass: 4 }
    }
};

async function getSettings() {
    try {
        const result = await chrome.storage.local.get('eqSettings');
        const settings = result.eqSettings;
        if (!settings || typeof settings !== 'object') {
            return { ...DEFAULT_SETTINGS };
        }
        return {
            enabled: settings.enabled !== undefined ? settings.enabled : DEFAULT_SETTINGS.enabled,
            gains: Array.isArray(settings.gains) && settings.gains.length === 31 ? settings.gains : DEFAULT_SETTINGS.gains,
            preset: settings.preset || DEFAULT_SETTINGS.preset,
            pluginDisabled: settings.pluginDisabled !== undefined ? settings.pluginDisabled : DEFAULT_SETTINGS.pluginDisabled,
            effects: settings.effects ? { ...AUDIO_EFFECTS_DEFAULT, ...settings.effects } : { ...AUDIO_EFFECTS_DEFAULT },
            effectsEnabled: settings.effectsEnabled !== undefined ? settings.effectsEnabled : DEFAULT_SETTINGS.effectsEnabled
        };
    } catch (error) {
        console.error('[MoeKoeEQ-Background] Failed to get settings:', error);
        return { ...DEFAULT_SETTINGS };
    }
}

async function saveSettings(settings) {
    try {
        await chrome.storage.local.set({ eqSettings: settings });
        console.log('[MoeKoeEQ-Background] Settings saved:', settings);
    } catch (error) {
        console.error('[MoeKoeEQ-Background] Failed to save settings:', error);
    }
}

async function broadcastMessage(message) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        try {
            await chrome.tabs.sendMessage(tab.id, message);
        } catch (e) {
            // Tab might not have content script loaded
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[MoeKoeEQ-Background] Received message:', message);

    const handleMessage = async () => {
        try {
            switch (message.action) {
                case 'get-settings':
                    const settings = await getSettings();
                    return { success: true, settings };

                case 'save-settings':
                    await saveSettings(message.settings);
                    return { success: true };

                case 'toggle-eq':
                    const currentSettings = await getSettings();
                    currentSettings.enabled = message.enabled;
                    await saveSettings(currentSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'toggle-eq',
                        data: { enabled: message.enabled }
                    });
                    return { success: true };

                case 'toggle-plugin-disabled':
                    const pluginSettings = await getSettings();
                    pluginSettings.pluginDisabled = message.disabled;
                    await saveSettings(pluginSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'toggle-plugin-disabled',
                        data: { disabled: message.disabled }
                    });
                    return { success: true };

                case 'reset-plugin':
                    await saveSettings(DEFAULT_SETTINGS);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'reset-plugin'
                    });
                    return { success: true };

                case 'reset-eq':
                    const resetSettings = await getSettings();
                    resetSettings.preset = 'flat';
                    resetSettings.gains = Array(31).fill(0);
                    await saveSettings(resetSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'reset-eq'
                    });
                    return { success: true };

                case 'apply-preset':
                    const presetSettings = await getSettings();
                    let preset;
                    
                    if (message.presetData) {
                        preset = message.presetData;
                    } else if (EQ_PRESETS[message.preset]) {
                        preset = EQ_PRESETS[message.preset];
                    }
                    
                    if (preset) {
                        presetSettings.preset = message.preset;
                        presetSettings.gains = [...preset.gains];
                        if (preset.effects) {
                            presetSettings.effects = { ...AUDIO_EFFECTS_DEFAULT, ...preset.effects };
                            presetSettings.effectsEnabled = true;
                        }
                        await saveSettings(presetSettings);

                        await broadcastMessage({
                            source: '__moekoe_eq_background__',
                            type: 'apply-preset',
                            data: { preset: message.preset, gains: preset.gains, effects: preset.effects }
                        });
                        return { success: true };
                    } else {
                        return { success: false, error: 'Unknown preset' };
                    }

                case 'get-presets':
                    return { success: true, presets: EQ_PRESETS };

                case 'get-frequencies':
                    return { success: true, frequencies: EQ_FREQUENCIES };

                case 'set-effect':
                    const effectSettings = await getSettings();
                    if (!effectSettings.effects) {
                        effectSettings.effects = { ...AUDIO_EFFECTS_DEFAULT };
                    }
                    effectSettings.effects[message.effect] = message.value;
                    await saveSettings(effectSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'set-effect',
                        data: { effect: message.effect, value: message.value }
                    });
                    return { success: true };

                case 'toggle-effects':
                    const effectsToggleSettings = await getSettings();
                    effectsToggleSettings.effectsEnabled = message.enabled;
                    await saveSettings(effectsToggleSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'toggle-effects',
                        data: { enabled: message.enabled }
                    });
                    return { success: true };

                case 'reset-effects':
                    const resetEffectsSettings = await getSettings();
                    resetEffectsSettings.effects = { ...AUDIO_EFFECTS_DEFAULT };
                    await saveSettings(resetEffectsSettings);

                    await broadcastMessage({
                        source: '__moekoe_eq_background__',
                        type: 'reset-effects'
                    });
                    return { success: true };

                default:
                    return { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            console.error('[MoeKoeEQ-Background] Error handling message:', error);
            return { success: false, error: error.message };
        }
    };

    handleMessage().then(sendResponse);
    return true;
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log('[MoeKoeEQ-Background] Extension installed');

    const existingSettings = await getSettings();
    if (!existingSettings || Object.keys(existingSettings).length === 0) {
        await saveSettings(DEFAULT_SETTINGS);
        console.log('[MoeKoeEQ-Background] Default settings initialized');
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[MoeKoeEQ-Background] Extension started');
});

console.log('[MoeKoeEQ-Background] Service worker initialized');
