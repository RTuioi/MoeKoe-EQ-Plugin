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

let currentSettings = {
    enabled: true,
    gains: Array(31).fill(0),
    preset: 'flat',
    pluginDisabled: false,
    effects: { ...AUDIO_EFFECTS_DEFAULT },
    effectsEnabled: true
};

const toggleInput = document.getElementById('eq-toggle-input');
const pluginDisableInput = document.getElementById('plugin-disable-input');
const statusMode = document.getElementById('status-mode');
const statusPreset = document.getElementById('status-preset');
const statusEffects = document.getElementById('status-effects');
const resetBtn = document.getElementById('reset-btn');
const openPanelBtn = document.getElementById('open-panel-btn');
const closePanelBtn = document.getElementById('close-panel-btn');

function updateUI() {
    toggleInput.checked = currentSettings.enabled;
    pluginDisableInput.checked = currentSettings.pluginDisabled;

    const presetName = EQ_PRESETS[currentSettings.preset]?.name || '-';
    statusPreset.textContent = presetName;

    if (currentSettings.pluginDisabled) {
        statusMode.textContent = '插件已禁用';
        statusMode.className = 'status-value warning';
        toggleInput.disabled = true;
    } else if (currentSettings.enabled) {
        statusMode.textContent = '已启用';
        statusMode.className = 'status-value success';
        toggleInput.disabled = false;
    } else {
        statusMode.textContent = '已禁用';
        statusMode.className = 'status-value';
        toggleInput.disabled = false;
    }

    if (currentSettings.effectsEnabled) {
        const activeEffects = [];
        const effects = currentSettings.effects || {};
        
        if (effects.clarity > 0) activeEffects.push('清晰度');
        if (effects.surround > 0) activeEffects.push('环绕');
        if (effects.ambiance > 0) activeEffects.push('环境感');
        if (effects.dynamicBass > 0) activeEffects.push('低音增强');
        if (effects.bassBoost > 0) activeEffects.push('低频提升');
        if (effects.trebleBoost > 0) activeEffects.push('高频提升');
        if (effects.vocalEnhance > 0) activeEffects.push('人声增强');
        if (effects.presence > 0) activeEffects.push('临场感');
        if (effects.warmth > 0) activeEffects.push('温暖感');
        if (effects.dynamicEnhance > 0) activeEffects.push('动态增强');
        if (effects.reverb > 0) activeEffects.push('混响');
        
        if (activeEffects.length > 0) {
            statusEffects.textContent = activeEffects.slice(0, 3).join('、') + (activeEffects.length > 3 ? '...' : '');
            statusEffects.className = 'status-value success';
        } else {
            statusEffects.textContent = '默认';
            statusEffects.className = 'status-value';
        }
    } else {
        statusEffects.textContent = '已关闭';
        statusEffects.className = 'status-value warning';
    }
}

async function loadSettings() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'get-settings' });
        if (response && response.success && response.settings) {
            currentSettings = { ...currentSettings, ...response.settings };
            if (!currentSettings.effects) {
                currentSettings.effects = { ...AUDIO_EFFECTS_DEFAULT };
            }
            if (currentSettings.effectsEnabled === undefined) {
                currentSettings.effectsEnabled = true;
            }
            updateUI();
        }
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to load settings:', error);
    }
}

async function saveSettings() {
    try {
        await chrome.runtime.sendMessage({
            action: 'save-settings',
            settings: currentSettings
        });
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to save settings:', error);
    }
}

async function toggleEQ(enabled) {
    currentSettings.enabled = enabled;

    try {
        await chrome.runtime.sendMessage({
            action: 'toggle-eq',
            enabled: enabled
        });
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to toggle EQ:', error);
    }

    updateUI();
}

async function togglePluginDisabled(disabled) {
    currentSettings.pluginDisabled = disabled;

    try {
        await chrome.runtime.sendMessage({
            action: 'toggle-plugin-disabled',
            disabled: disabled
        });
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to toggle plugin disabled:', error);
    }

    updateUI();
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const box = document.createElement('div');
        box.className = 'modal-box';
        box.innerHTML = `
            <div class="modal-title">${title}</div>
            <div class="modal-message">${message}</div>
            <div class="modal-buttons">
                <button class="modal-btn" id="modal-cancel">取消</button>
                <button class="modal-btn danger" id="modal-confirm">确定</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const cancelBtn = box.querySelector('#modal-cancel');
        const confirmBtn = box.querySelector('#modal-confirm');

        const close = (value) => {
            overlay.remove();
            resolve(value);
        };

        cancelBtn.addEventListener('click', () => close(false));
        confirmBtn.addEventListener('click', () => close(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });
    });
}

async function resetPlugin() {
    const confirmed = await showConfirmDialog('重置插件', '确定要将插件重置为初始状态吗？这将清除所有自定义设置。');
    if (!confirmed) return;

    currentSettings.enabled = true;
    currentSettings.preset = 'flat';
    currentSettings.gains = Array(31).fill(0);
    currentSettings.pluginDisabled = false;

    try {
        await chrome.runtime.sendMessage({
            action: 'reset-plugin'
        });
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to reset plugin:', error);
    }

    updateUI();
}

async function showFabButton() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, {
                source: '__moekoe_eq_popup__',
                type: 'show-fab'
            });
        }
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to show FAB:', error);
    }
}

async function hideFabButton() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, {
                source: '__moekoe_eq_popup__',
                type: 'hide-fab'
            });
        }
    } catch (error) {
        console.error('[MoeKoeEQ-Popup] Failed to hide FAB:', error);
    }
}

toggleInput.addEventListener('change', (e) => {
    toggleEQ(e.target.checked);
});

pluginDisableInput.addEventListener('change', (e) => {
    togglePluginDisabled(e.target.checked);
});

resetBtn.addEventListener('click', resetPlugin);
openPanelBtn.addEventListener('click', showFabButton);
closePanelBtn.addEventListener('click', hideFabButton);

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.source === '__moekoe_eq_background__') {
        switch (message.type) {
            case 'toggle-eq':
                currentSettings.enabled = message.data.enabled;
                updateUI();
                break;
            case 'toggle-plugin-disabled':
                currentSettings.pluginDisabled = message.data.disabled;
                updateUI();
                break;
        }
    }
    return true;
});
