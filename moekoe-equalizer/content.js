(function() {
    'use strict';
    
    if (window.__MOEKOE_EQ_CONTENT__) {
        console.log('[MoeKoeEQ-Content] Already initialized, skipping');
        return;
    }
    window.__MOEKOE_EQ_CONTENT__ = true;
    
    console.log('[MoeKoeEQ-Content] Content script initializing...');
    
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
            effects: {
                clarity: 4,
                ambiance: 2,
                surround: 2,
                dynamicEnhance: 8,
                dynamicBass: 3
            }
        },
        ultimate: {
            name: '极致听感',
            gains: [2, 2, 2, 2, 3, 3, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2],
            effects: {
                clarity: 5,
                ambiance: 3,
                surround: 3,
                dynamicEnhance: 10,
                dynamicBass: 5,
                warmth: 3,
                presence: 2
            }
        },
        harmankardon: {
            name: '醇美空间',
            gains: [2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -1, 0, 0, 1, 1, 2, 2, 2, 3, 3, 2, 1, 1, 1, 1, 1, 1],
            effects: {
                clarity: 4,
                ambiance: 4,
                surround: 5,
                dynamicEnhance: 6,
                dynamicBass: 4
            }
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
    
    const State = {
        enabled: true,
        gains: Array(31).fill(0),
        preset: 'flat',
        mode: 'waiting',
        initialized: false,
        panelVisible: false,
        activeTab: 'eq',
        effects: { ...AUDIO_EFFECTS_DEFAULT },
        effectsEnabled: true,
        pluginDisabled: false
    };
    
    let shadowRef = null;
    let customPresets = [];
    let statePollingInterval = null;
    
    const CSS_RULES = `
        :host {
            all: initial;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        .eq-fab {
            position: fixed;
            bottom: 110px;
            right: 20px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
            z-index: 99998;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
        }

        .eq-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(79, 172, 254, 0.6);
        }

        .eq-fab.active {
            background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        }

        .eq-fab svg {
            width: 18px;
            height: 18px;
            fill: white;
        }
        
        .eq-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff4757;
            color: white;
            font-size: 9px;
            font-weight: 600;
            padding: 2px 5px;
            border-radius: 10px;
            white-space: nowrap;
        }
        
        .eq-panel {
            position: fixed;
            bottom: 150px;
            right: 20px;
            width: 720px;
            max-width: calc(100vw - 40px);
            max-height: 90vh;
            background: rgba(30, 30, 30, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
            z-index: 99999;
            overflow: hidden;
            display: none;
            flex-direction: column;
            pointer-events: auto;
        }
        
        @media (max-width: 800px) {
            .eq-panel {
                width: calc(100vw - 20px);
                right: 10px;
                bottom: 80px;
                max-height: 80vh;
            }
            
            .eq-bands {
                overflow-x: auto;
                padding-bottom: 8px;
            }
            
            .eq-slider-container {
                height: 140px;
            }
            
            .eq-slider {
                height: 140px;
            }
            
            .eq-presets-grid {
                grid-template-columns: repeat(4, 1fr);
            }
            
            .effects-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 500px) {
            .eq-panel {
                width: calc(100vw - 10px);
                right: 5px;
                bottom: 60px;
                max-height: 75vh;
                border-radius: 12px;
            }
            
            .eq-header {
                padding: 10px 12px;
            }
            
            .eq-title {
                font-size: 13px;
            }
            
            .eq-bands {
                min-width: 600px;
            }
            
            .eq-slider-container {
                height: 120px;
            }
            
            .eq-slider {
                height: 120px;
            }
            
            .eq-presets-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            
            .eq-band-label {
                font-size: 7px;
            }
            
            .eq-band-value {
                font-size: 8px;
            }
        }
        
        .eq-panel.visible {
            display: flex;
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .eq-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .eq-title {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #fff;
            font-size: 15px;
            font-weight: 600;
        }
        
        .eq-title svg {
            width: 18px;
            height: 18px;
            fill: #4facfe;
        }
        
        .eq-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .eq-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .eq-toggle-label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            font-weight: 500;
        }
        
        .eq-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            cursor: pointer;
        }
        
        .eq-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .eq-slider-switch {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.2);
            transition: 0.3s;
            border-radius: 24px;
        }
        
        .eq-slider-switch:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input:checked + .eq-slider-switch {
            background-color: #4facfe;
        }
        
        input:checked + .eq-slider-switch:before {
            transform: translateX(20px);
        }
        
        .eq-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: none;
            background: rgba(255, 80, 80, 0.2);
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .eq-close-btn:hover {
            background: rgba(255, 80, 80, 0.4);
            color: #fff;
        }
        
        .eq-close-btn svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
        
        .eq-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .eq-tab {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 20px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
        }
        
        .eq-tab:hover {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.05);
        }
        
        .eq-tab.active {
            color: #4facfe;
            border-bottom-color: #4facfe;
            background: rgba(255, 255, 255, 0.05);
        }
        
        .eq-tab svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
        
        .eq-tab-content {
            display: none;
            overflow-y: auto;
            flex: 1;
        }
        
        .eq-tab-content.active {
            display: block;
        }
        
        .eq-curve-section {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .eq-curve-canvas {
            width: 100%;
            height: 100px;
            border-radius: 8px;
            background: rgba(20, 20, 20, 0.8);
        }
        
        .eq-presets {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .eq-presets-title {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .eq-presets-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
        }
        
        .preset-actions .eq-action-btn {
            min-width: 80px;
        }
        
        .eq-preset-btn {
            padding: 10px 4px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        
        .eq-preset-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #4facfe;
        }
        
        .eq-preset-btn.active {
            background: linear-gradient(135deg, rgba(79, 172, 254, 0.3), rgba(0, 242, 254, 0.3));
            border-color: #4facfe;
            color: #fff;
        }
        
        .eq-preset-btn.custom {
            border-color: #2ecc71;
        }
        
        .eq-preset-btn.built-in {
            border-color: #e67e22;
        }
        
        .eq-body {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }
        
        .eq-bands {
            display: flex;
            justify-content: space-between;
            gap: 3px;
            padding: 0 4px;
        }
        
        .eq-band {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 12px;
            cursor: ns-resize;
        }
        
        .eq-fine-tune-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.15s;
            font-size: 10px;
        }
        
        .eq-fine-tune-btn:hover {
            background: #4facfe;
            border-color: #4facfe;
            color: #fff;
        }
        
        .eq-tune-up { margin-bottom: 2px; }
        .eq-tune-down { margin-top: 2px; }
        
        .eq-slider-container {
            height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            width: 100%;
        }
        
        .eq-slider-track {
            position: relative;
            height: 100%;
            width: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        
        .eq-slider-center {
            position: absolute;
            left: -3px;
            right: -3px;
            top: 50%;
            height: 2px;
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-50%);
            border-radius: 1px;
        }
        
        .eq-slider-fill {
            position: absolute;
            left: 0;
            right: 0;
            background: linear-gradient(180deg, #4facfe, #00f2fe);
            border-radius: 3px;
            transition: height 0.05s, top 0.05s;
        }
        
        .eq-slider {
            width: 8px;
            height: 180px;
            background: transparent;
            border-radius: 3px;
            outline: none;
            cursor: pointer;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            writing-mode: vertical-lr;
            direction: rtl;
        }
        
        .eq-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            border: 2px solid #4facfe;
        }
        
        .eq-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: 2px solid #4facfe;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .eq-band-label {
            margin-top: 6px;
            font-size: 8px;
            color: rgba(255, 255, 255, 0.5);
            text-align: center;
            white-space: nowrap;
        }
        
        .eq-band-value {
            margin-top: 2px;
            font-size: 9px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            min-height: 12px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }
        
        .eq-frequency-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 12px;
            padding: 8px 10px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .eq-freq-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);
            font-weight: 500;
        }
        
        .eq-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .eq-mode-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(79, 172, 254, 0.2);
            border-radius: 12px;
            font-size: 11px;
            color: #4facfe;
        }
        
        .eq-mode-badge.success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }
        
        .eq-mode-badge.warning {
            background: rgba(241, 196, 15, 0.2);
            color: #f1c40f;
        }
        
        .eq-actions {
            display: flex;
            gap: 8px;
        }
        
        .eq-action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .eq-action-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #4facfe;
            color: #fff;
        }
        
        .eq-action-btn svg {
            width: 12px;
            height: 12px;
            fill: currentColor;
        }
        
        .eq-action-btn.primary {
            background: linear-gradient(135deg, rgba(79, 172, 254, 0.3), rgba(0, 242, 254, 0.3));
            border-color: #4facfe;
        }
        
        .eq-action-btn.danger {
            border-color: rgba(255, 80, 80, 0.3);
        }
        
        .eq-action-btn.danger:hover {
            background: rgba(255, 80, 80, 0.2);
            border-color: rgba(255, 80, 80, 0.5);
            color: #ff6b6b;
        }
        
        .effects-body {
            padding: 16px;
            overflow-y: auto;
            max-height: calc(90vh - 200px);
        }
        
        .effects-toggle-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .effects-section {
            margin-bottom: 16px;
        }
        
        .effects-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .effects-section-title svg {
            width: 12px;
            height: 12px;
            fill: #4facfe;
        }
        
        .effects-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        
        .effect-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s;
        }
        
        .effect-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
        }
        
        .effect-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .effect-name {
            font-size: 12px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .effect-value {
            font-size: 11px;
            font-weight: 600;
            color: #4facfe;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }
        
        .effect-slider {
            width: 100%;
            height: 4px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
        }
        
        .effect-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #4facfe;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .effect-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #4facfe;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .effect-desc {
            margin-top: 6px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);
        }
        
        .conflict-warning {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 14px;
            background: rgba(255, 193, 7, 0.15);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            margin-bottom: 12px;
            animation: slideIn 0.3s ease-out;
        }
        
        .conflict-warning svg {
            width: 16px;
            height: 16px;
            fill: #ffc107;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .conflict-message {
            flex: 1;
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            line-height: 1.4;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .preset-actions {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .eq-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: fadeIn 0.2s ease-out;
            pointer-events: auto;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .eq-modal {
            background: rgba(40, 40, 40, 0.98);
            border-radius: 12px;
            padding: 20px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.2s ease-out;
            pointer-events: auto;
        }
        
        @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        
        .eq-modal-title {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 16px;
        }
        
        .eq-modal-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .eq-modal-input:focus {
            border-color: #4facfe;
        }
        
        .eq-modal-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }
        
        .eq-modal-message {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 16px;
            line-height: 1.5;
        }
        
        .eq-modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
        }
        
        .eq-modal-btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .eq-modal-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .eq-modal-btn.primary {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-color: #4facfe;
            color: #fff;
        }
        
        .eq-modal-btn.primary:hover {
            opacity: 0.9;
        }
        
        .eq-modal-btn.danger {
            border-color: rgba(255, 80, 80, 0.5);
            color: #ff6b6b;
        }
        
        .eq-modal-btn.danger:hover {
            background: rgba(255, 80, 80, 0.2);
        }
    `;
    
    function createUI() {
        const host = document.createElement('div');
        host.id = 'moekoe-eq-host';
        host.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 99997;';

        const shadow = host.attachShadow({ mode: 'closed' });
        shadowRef = shadow;
        
        const style = document.createElement('style');
        style.textContent = CSS_RULES;
        shadow.appendChild(style);
        
        const fab = document.createElement('button');
        fab.className = 'eq-fab';
        fab.id = 'eq-fab';
        fab.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
            <span class="eq-badge" id="eq-fab-badge" style="display: none;">EQ</span>
        `;
        fab.style.pointerEvents = 'auto';
        shadow.appendChild(fab);
        
        const panel = document.createElement('div');
        panel.className = 'eq-panel';
        panel.id = 'eq-panel';
        panel.innerHTML = `
            <div class="eq-header">
                <div class="eq-title">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                    </svg>
                    <span>31段均衡器</span>
                </div>
                <div class="eq-controls">
                    <div class="eq-toggle">
                        <span class="eq-toggle-label">EQ</span>
                        <label class="eq-switch">
                            <input type="checkbox" id="eq-toggle-input">
                            <span class="eq-slider-switch"></span>
                        </label>
                    </div>
                    <button class="eq-close-btn" id="eq-close-btn">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="eq-tabs">
                <button class="eq-tab active" data-tab="eq">
                    <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                    均衡器
                </button>
                <button class="eq-tab" data-tab="effects">
                    <svg viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/></svg>
                    音效增强
                </button>
            </div>
            
            <div class="eq-tab-content active" id="tab-eq">
                <div class="eq-curve-section">
                    <canvas id="eq-curve-canvas" class="eq-curve-canvas"></canvas>
                </div>
                
                <div class="eq-presets">
                    <div class="eq-presets-title">预设</div>
                    <div class="eq-presets-grid" id="eq-presets-grid"></div>
                </div>
                
                <div class="eq-body">
                    <div class="eq-bands" id="eq-bands"></div>
                    <div class="eq-frequency-labels">
                        <span class="eq-freq-label">低频</span>
                        <span class="eq-freq-label">中低频</span>
                        <span class="eq-freq-label">中频</span>
                        <span class="eq-freq-label">中高频</span>
                        <span class="eq-freq-label">高频</span>
                    </div>
                </div>
                
                <div class="preset-actions" id="preset-actions" style="display: none;">
                    <button class="eq-action-btn primary" id="btn-update-preset">更新预设</button>
                    <button class="eq-action-btn danger" id="btn-delete-preset">删除预设</button>
                </div>
            </div>
            
            <div class="eq-tab-content" id="tab-effects">
                <div class="effects-body">
                    <div class="effects-toggle-header">
                        <div class="eq-toggle">
                            <span class="eq-toggle-label">音效增强</span>
                            <label class="eq-switch">
                                <input type="checkbox" id="effects-toggle-input">
                                <span class="eq-slider-switch"></span>
                            </label>
                        </div>
                        <button class="eq-action-btn" id="btn-reset-effects">重置</button>
                    </div>
                    
                    <div class="conflict-warning" id="conflict-warning" style="display: none;">
                        <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                        <div class="conflict-message" id="conflict-message"></div>
                    </div>
                    
                    <div class="effects-section">
                        <div class="effects-section-title">
                            <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                            频率调节
                        </div>
                        <div class="effects-grid" id="effects-frequency"></div>
                    </div>
                    
                    <div class="effects-section">
                        <div class="effects-section-title">
                            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            空间效果
                        </div>
                        <div class="effects-grid" id="effects-spatial"></div>
                    </div>
                    
                    <div class="effects-section">
                        <div class="effects-section-title">
                            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                            输出控制
                        </div>
                        <div class="effects-grid" id="effects-output"></div>
                    </div>
                </div>
            </div>
            
            <div class="eq-footer">
                <div class="eq-mode-badge" id="eq-mode-badge">
                    <span id="eq-mode-text">检测中...</span>
                </div>
                <div class="eq-actions">
                    <button class="eq-action-btn primary" id="eq-save-preset-btn" title="保存当前设置为自定义预设">
                        <svg viewBox="0 0 24 24">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                        </svg>
                        保存
                    </button>
                    <button class="eq-action-btn" id="eq-reset-btn">
                        <svg viewBox="0 0 24 24">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                        重置
                    </button>
                </div>
            </div>
        `;
        panel.style.pointerEvents = 'auto';
        shadow.appendChild(panel);
        
        document.body.appendChild(host);
        
        return { host, shadow, fab, panel };
    }
    
    function createPresetButtons(shadow) {
        const grid = shadow.getElementById('eq-presets-grid');
        grid.innerHTML = '';
        
        const builtInKeys = ['flat', 'rock', 'classical', 'pop', 'jazz', 'bass', 'treble', 'vocal'];
        const localProjectKeys = ['fengxue', 'ultimate', 'harmankardon'];
        
        builtInKeys.forEach(key => {
            const preset = EQ_PRESETS[key];
            if (!preset) return;
            
            const btn = document.createElement('button');
            btn.className = 'eq-preset-btn';
            btn.dataset.preset = key;
            btn.textContent = preset.name;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyPreset(key);
            });
            grid.appendChild(btn);
        });
        
        localProjectKeys.forEach(key => {
            const preset = EQ_PRESETS[key];
            if (!preset) return;
            
            const btn = document.createElement('button');
            btn.className = 'eq-preset-btn built-in';
            btn.dataset.preset = key;
            btn.textContent = preset.name;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyPreset(key);
            });
            grid.appendChild(btn);
        });
        
        customPresets.forEach((preset) => {
            const btn = document.createElement('button');
            btn.className = 'eq-preset-btn custom';
            btn.dataset.preset = preset.id;
            btn.textContent = preset.name;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyPreset(preset.id);
            });
            grid.appendChild(btn);
        });
    }
    
    function createSliders(shadow) {
        const bands = shadow.getElementById('eq-bands');
        bands.innerHTML = '';
        
        EQ_FREQUENCIES.forEach((freq, index) => {
            const band = document.createElement('div');
            band.className = 'eq-band';
            
            band.innerHTML = `
                <button class="eq-fine-tune-btn eq-tune-up" data-index="${index}" title="+0.5dB">+</button>
                <div class="eq-slider-container">
                    <div class="eq-slider-track">
                        <div class="eq-slider-center"></div>
                        <div class="eq-slider-fill" id="eq-fill-${index}" style="top: 50%; height: 0;"></div>
                    </div>
                    <input type="range" class="eq-slider" id="eq-slider-${index}"
                           min="-6" max="6" step="0.5" value="0"
                           orient="vertical">
                </div>
                <button class="eq-fine-tune-btn eq-tune-down" data-index="${index}" title="-0.5dB">-</button>
                <div class="eq-band-label">${formatFrequency(freq)}</div>
                <div class="eq-band-value" id="eq-value-${index}">0.0</div>
            `;
            
            bands.appendChild(band);
            
            const slider = band.querySelector('.eq-slider');
            const tuneUp = band.querySelector('.eq-tune-up');
            const tuneDown = band.querySelector('.eq-tune-down');
            
            slider.addEventListener('input', (e) => {
                e.preventDefault();
                const value = parseFloat(e.target.value);
                setGain(index, value);
            });
            
            slider.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                setGain(index, value);
            });
            
            tuneUp.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fineTuneGain(index, 0.5);
            });
            
            tuneDown.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fineTuneGain(index, -0.5);
            });
            
            band.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.5 : 0.5;
                fineTuneGain(index, delta);
            });
        });
    }
    
    function createEffectsControls(shadow) {
        const frequencyEffects = [
            { key: 'bassBoost', name: '低频提升', desc: '增强60Hz低频' },
            { key: 'dynamicBass', name: '低音增强', desc: '增强低频力度' },
            { key: 'warmth', name: '温暖感', desc: '增强中低频' },
            { key: 'vocalEnhance', name: '人声增强', desc: '增强3kHz人声' },
            { key: 'presence', name: '临场感', desc: '增强4kHz频段' },
            { key: 'clarity', name: '清晰度', desc: '增强高频细节' },
            { key: 'trebleBoost', name: '高频提升', desc: '增强8kHz以上' },
            { key: 'dynamicEnhance', name: '动态增强', desc: '压缩动态范围' }
        ];
        
        const spatialEffects = [
            { key: 'ambiance', name: '环境感', desc: '添加空间感' },
            { key: 'surround', name: '环绕声', desc: '立体声扩展' },
            { key: 'reverb', name: '环境混响', desc: '沉浸混响效果' }
        ];
        
        const outputEffects = [
            { key: 'outputGain', name: '输出增益', desc: '整体音量增益', min: 0, max: 100, default: 50 },
            { key: 'stereoBalance', name: '声道平衡', desc: '左右声道平衡', min: 0, max: 100, default: 50 }
        ];
        
        const freqContainer = shadow.getElementById('effects-frequency');
        frequencyEffects.forEach(effect => {
            freqContainer.appendChild(createEffectItem(shadow, effect.key, effect.name, effect.desc, 0, 100, 0));
        });
        
        const spatialContainer = shadow.getElementById('effects-spatial');
        spatialEffects.forEach(effect => {
            spatialContainer.appendChild(createEffectItem(shadow, effect.key, effect.name, effect.desc, 0, 100, 0));
        });
        
        const outputContainer = shadow.getElementById('effects-output');
        outputEffects.forEach(effect => {
            outputContainer.appendChild(createEffectItem(shadow, effect.key, effect.name, effect.desc, 0, 100, effect.default || 50));
        });
    }
    
    function createEffectItem(shadow, key, name, desc, min, max, defaultValue = 0) {
        const item = document.createElement('div');
        item.className = 'effect-item';
        
        let displayValue = defaultValue + '%';
        if (key === 'stereoBalance') {
            displayValue = defaultValue === 50 ? '居中' : (defaultValue < 50 ? `左 ${50 - defaultValue}%` : `右 ${defaultValue - 50}%`);
        } else if (key === 'outputGain') {
            displayValue = defaultValue === 50 ? '0 dB' : (defaultValue === 0 ? '-∞ dB' : `${(20 * Math.log10(defaultValue / 50)).toFixed(1)} dB`);
        }
        
        item.innerHTML = `
            <div class="effect-header">
                <span class="effect-name">${name}</span>
                <span class="effect-value" id="effect-value-${key}">${displayValue}</span>
            </div>
            <input type="range" class="effect-slider" id="effect-slider-${key}"
                   min="${min}" max="${max}" value="${defaultValue}" data-effect="${key}">
            <div class="effect-desc">${desc}</div>
        `;
        
        const slider = item.querySelector('.effect-slider');
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            setEffect(key, value);
        });
        
        return item;
    }
    
    function formatFrequency(freq) {
        if (freq >= 1000) {
            return (freq / 1000) + 'k';
        }
        return freq.toString();
    }
    
    function updateSlider(shadow, index, value) {
        if (!shadow) return;
        
        const slider = shadow.getElementById(`eq-slider-${index}`);
        const valueEl = shadow.getElementById(`eq-value-${index}`);
        const fillEl = shadow.getElementById(`eq-fill-${index}`);
        
        if (slider) slider.value = value;
        
        if (valueEl) {
            valueEl.textContent = (value > 0 ? '+' : '') + value.toFixed(1);
            valueEl.style.color = value > 0 ? '#4facfe' : value < 0 ? '#ff6b6b' : 'rgba(255, 255, 255, 0.9)';
        }
        
        if (fillEl) {
            const height = Math.abs(value) / 6 * 50;
            const top = value >= 0 ? (50 - height) : 50;
            fillEl.style.height = height + '%';
            fillEl.style.top = top + '%';
        }
    }
    
    function updateAllSliders(shadow) {
        if (!shadow) return;
        State.gains.forEach((gain, index) => {
            updateSlider(shadow, index, gain);
        });
    }
    
    function updatePresetButtons(shadow) {
        if (!shadow) return;
        
        const buttons = shadow.querySelectorAll('.eq-preset-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === State.preset);
        });
        
        const presetActions = shadow.getElementById('preset-actions');
        if (presetActions) {
            presetActions.style.display = State.preset.startsWith('custom_') ? 'flex' : 'none';
        }
    }
    
    function updateModeBadge(shadow) {
        if (!shadow) return;
        
        const badge = shadow.getElementById('eq-mode-badge');
        const text = shadow.getElementById('eq-mode-text');
        
        if (!badge || !text) return;
        
        if (State.initialized) {
            badge.className = 'eq-mode-badge success';
            text.textContent = 'EQ 已就绪';
        } else {
            badge.className = 'eq-mode-badge warning';
            text.textContent = '检测中...';
        }
    }
    
    function updateFabBadge(shadow) {
        if (!shadow) return;
        
        const fab = shadow.getElementById('eq-fab');
        const badge = shadow.getElementById('eq-fab-badge');
        
        if (!fab || !badge) return;
        
        if (State.enabled) {
            badge.style.display = 'block';
            fab.classList.add('active');
        } else {
            badge.style.display = 'none';
            fab.classList.remove('active');
        }
    }
    
    function drawEQCurve(shadow) {
        const canvas = shadow.getElementById('eq-curve-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        
        const width = rect.width;
        const height = rect.height;
        const centerY = height / 2;
        const dbRange = 12;
        
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        const points = [];
        for (let i = 0; i < State.gains.length; i++) {
            const x = (i / (State.gains.length - 1)) * width;
            const gain = State.gains[i];
            const y = centerY - (gain / dbRange) * (height / 2);
            points.push({ x, y });
        }
        
        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        }
        
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(79, 172, 254, 0.2)';
        ctx.beginPath();
        if (points.length > 0) {
            ctx.moveTo(points[0].x, centerY);
            for (let i = 0; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.lineTo(points[points.length - 1].x, centerY);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    function setGain(index, value) {
        State.gains[index] = value;
        
        sendMessage('set-gain', { index, gain: value });
        
        if (shadowRef) {
            updateSlider(shadowRef, index, value);
            drawEQCurve(shadowRef);
        }
        
        checkConflicts();
        saveSettingsToStorage();
    }
    
    function fineTuneGain(index, delta) {
        const currentValue = State.gains[index];
        const newValue = Math.max(-6, Math.min(6, currentValue + delta));
        setGain(index, newValue);
    }
    
    function setEffect(key, value) {
        State.effects[key] = value;
        
        sendMessage('set-effect', { effect: key, value });
        
        if (shadowRef) {
            const valueEl = shadowRef.getElementById(`effect-value-${key}`);
            if (valueEl) {
                if (key === 'stereoBalance') {
                    if (value === 50) valueEl.textContent = '居中';
                    else if (value < 50) valueEl.textContent = `左 ${50 - value}%`;
                    else valueEl.textContent = `右 ${value - 50}%`;
                } else if (key === 'outputGain') {
                    const db = value === 50 ? '0 dB' : value === 0 ? '-∞ dB' : `${(20 * Math.log10(value / 50)).toFixed(1)} dB`;
                    valueEl.textContent = db;
                } else {
                    valueEl.textContent = value + '%';
                }
            }
        }
        
        checkConflicts();
        saveSettingsToStorage();
    }
    
    function checkConflicts() {
        if (!shadowRef) return;
        
        const warnings = [];
        
        const highEQBands = State.gains.filter(g => Math.abs(g) > 4).length;
        if (highEQBands > 5) {
            warnings.push('EQ 增益过高，可能导致失真');
        }
        
        const totalEQGain = State.gains.reduce((sum, g) => sum + Math.abs(g), 0);
        if (totalEQGain > 80) {
            warnings.push('EQ 总增益过高');
        }
        
        const highEffects = [];
        if (State.effects.bassBoost > 70) highEffects.push('低频提升');
        if (State.effects.trebleBoost > 70) highEffects.push('高频提升');
        if (State.effects.vocalEnhance > 70) highEffects.push('人声增强');
        
        if (highEffects.length >= 2) {
            warnings.push(`多个音效同时高负荷（${highEffects.join('、')}）`);
        }
        
        const warningEl = shadowRef.getElementById('conflict-warning');
        const messageEl = shadowRef.getElementById('conflict-message');
        
        if (warnings.length > 0) {
            warningEl.style.display = 'flex';
            messageEl.textContent = '⚠️ ' + warnings.join('；');
        } else {
            warningEl.style.display = 'none';
        }
    }
    
    function applyPreset(presetName) {
        let preset;
        
        if (presetName.startsWith('custom_')) {
            preset = customPresets.find(p => p.id === presetName);
        } else {
            preset = EQ_PRESETS[presetName];
        }
        
        if (!preset) return;
        
        State.preset = presetName;
        State.gains = [...preset.gains];
        
        if (preset.effects) {
            State.effects = { ...AUDIO_EFFECTS_DEFAULT, ...preset.effects };
            State.effectsEnabled = true;
            
            Object.keys(preset.effects).forEach(key => {
                sendMessage('set-effect', { effect: key, value: preset.effects[key] });
                updateEffectUI(shadowRef, key, preset.effects[key]);
            });
            
            sendMessage('toggle-effects', { enabled: true });
            
            const effectsToggle = shadowRef.getElementById('effects-toggle-input');
            if (effectsToggle) effectsToggle.checked = true;
        }
        
        sendMessage('apply-preset', { preset: presetName, presetData: preset });
        
        if (shadowRef) {
            updateAllSliders(shadowRef);
            updatePresetButtons(shadowRef);
            drawEQCurve(shadowRef);
        }
        
        saveSettingsToStorage();
    }
    
    function updateEffectUI(shadow, key, value) {
        if (!shadow) return;
        
        const slider = shadow.getElementById(`effect-slider-${key}`);
        const valueEl = shadow.getElementById(`effect-value-${key}`);
        
        if (slider) slider.value = value;
        
        if (valueEl) {
            if (key === 'stereoBalance') {
                if (value === 50) valueEl.textContent = '居中';
                else if (value < 50) valueEl.textContent = `左 ${50 - value}%`;
                else valueEl.textContent = `右 ${value - 50}%`;
            } else if (key === 'outputGain') {
                const db = value === 50 ? '0 dB' : value === 0 ? '-∞ dB' : `${(20 * Math.log10(value / 50)).toFixed(1)} dB`;
                valueEl.textContent = db;
            } else {
                valueEl.textContent = value + '%';
            }
        }
    }
    
    function toggleEQ(enabled) {
        State.enabled = enabled;
        
        sendMessage('toggle-eq', { enabled });
        
        if (shadowRef) {
            const toggle = shadowRef.getElementById('eq-toggle-input');
            if (toggle) toggle.checked = enabled;
            updateFabBadge(shadowRef);
        }
        
        saveSettingsToStorage();
    }
    
    function toggleEffects(enabled) {
        State.effectsEnabled = enabled;
        
        sendMessage('toggle-effects', { enabled });
        
        if (shadowRef) {
            const toggle = shadowRef.getElementById('effects-toggle-input');
            if (toggle) toggle.checked = enabled;
        }
        
        saveSettingsToStorage();
    }
    
    function resetEQ() {
        State.preset = 'flat';
        State.gains = Array(31).fill(0);
        
        sendMessage('reset-eq', {});
        
        if (shadowRef) {
            updateAllSliders(shadowRef);
            updatePresetButtons(shadowRef);
            drawEQCurve(shadowRef);
        }
        
        saveSettingsToStorage();
    }
    
    function resetEffects() {
        State.effects = { ...AUDIO_EFFECTS_DEFAULT };
        
        sendMessage('reset-effects', {});
        
        if (shadowRef) {
            Object.keys(AUDIO_EFFECTS_DEFAULT).forEach(key => {
                updateEffectUI(shadowRef, key, AUDIO_EFFECTS_DEFAULT[key]);
            });
        }
        
        saveSettingsToStorage();
    }
    
    function loadCustomPresets() {
        try {
            const saved = localStorage.getItem('__moekoe_eq_custom_presets');
            if (saved) {
                customPresets = JSON.parse(saved);
            }
        } catch(e) {
            customPresets = [];
        }
    }
    
    function loadSettingsFromStorage() {
        chrome.runtime.sendMessage({ action: 'get-settings' }, (response) => {
            if (response && response.success && response.settings) {
                const settings = response.settings;
                State.enabled = settings.enabled !== false;
                State.gains = settings.gains || Array(31).fill(0);
                State.preset = settings.preset || 'flat';
                State.effects = { ...AUDIO_EFFECTS_DEFAULT, ...(settings.effects || {}) };
                State.effectsEnabled = settings.effectsEnabled !== false;
                State.pluginDisabled = settings.pluginDisabled || false;
                console.log('[MoeKoeEQ-Content] Settings loaded from chrome.storage, pluginDisabled:', State.pluginDisabled);
                
                if (shadowRef) {
                    const toggle = shadowRef.getElementById('eq-toggle-input');
                    if (toggle) toggle.checked = State.enabled;
                    
                    const effectsToggle = shadowRef.getElementById('effects-toggle-input');
                    if (effectsToggle) effectsToggle.checked = State.effectsEnabled;
                    
                    Object.keys(State.effects).forEach(key => {
                        updateEffectUI(shadowRef, key, State.effects[key]);
                    });
                    
                    updateAllSliders(shadowRef);
                    updatePresetButtons(shadowRef);
                    updateModeBadge(shadowRef);
                    updateFabBadge(shadowRef);
                    drawEQCurve(shadowRef);
                    
                    if (State.pluginDisabled) {
                        const fab = shadowRef.getElementById('eq-fab');
                        if (fab) fab.style.display = 'none';
                    }
                }
            }
        });
    }
    
    function saveSettingsToStorage() {
        const settings = {
            enabled: State.enabled,
            gains: State.gains,
            preset: State.preset,
            effects: State.effects,
            effectsEnabled: State.effectsEnabled,
            pluginDisabled: State.pluginDisabled
        };
        
        chrome.runtime.sendMessage({
            action: 'save-settings',
            settings: settings
        }, (response) => {
            if (response && response.success) {
                console.log('[MoeKoeEQ-Content] Settings saved to chrome.storage');
            } else {
                console.error('[MoeKoeEQ-Content] Failed to save settings:', response?.error);
            }
        });
    }
    
    function saveCustomPresets() {
        try {
            localStorage.setItem('__moekoe_eq_custom_presets', JSON.stringify(customPresets));
        } catch(e) {}
    }
    
    function resetPlugin(shadow, fab) {
        // 清除所有存储的设置
        try {
            localStorage.removeItem('__moekoe_eq_settings');
            localStorage.removeItem('__moekoe_eq_custom_presets');
        } catch(e) {
            console.error('[MoeKoeEQ-Content] Failed to clear storage:', e);
        }
        
        // 重置 State 为默认值
        State.enabled = true;
        State.gains = Array(31).fill(0);
        State.preset = 'flat';
        State.pluginDisabled = false;
        State.effects = { ...AUDIO_EFFECTS_DEFAULT };
        State.effectsEnabled = true;
        
        // 显示 FAB 按钮
        fab.style.display = 'flex';
        
        // 更新 UI
        updateAllSliders(shadow);
        updatePresetButtons(shadow);
        drawEQCurve(shadow);
        
        // 通知主脚本重置
        sendMessage('reset-plugin', {});
        
        console.log('[MoeKoeEQ-Content] Plugin reset to initial state');
    }
    
    function showFabButton(shadow, fab) {
        fab.style.display = 'flex';
        State.pluginDisabled = false;
        console.log('[MoeKoeEQ-Content] FAB button shown');
    }
    
    function hideFabButton(shadow, fab) {
        fab.style.display = 'none';
        State.pluginDisabled = true;
        togglePanel(shadow, false);
        console.log('[MoeKoeEQ-Content] FAB button hidden, panel closed');
    }
    
    function showInputDialog(title, placeholder) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'eq-modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'eq-modal';
            modal.innerHTML = `
                <div class="eq-modal-title">${title}</div>
                <input type="text" class="eq-modal-input" placeholder="${placeholder}" id="eq-modal-input-field">
                <div class="eq-modal-buttons">
                    <button class="eq-modal-btn" id="eq-modal-cancel">取消</button>
                    <button class="eq-modal-btn primary" id="eq-modal-confirm">确定</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            shadowRef.appendChild(overlay);
            
            const input = modal.querySelector('#eq-modal-input-field');
            const cancelBtn = modal.querySelector('#eq-modal-cancel');
            const confirmBtn = modal.querySelector('#eq-modal-confirm');
            
            input.focus();
            
            const close = (value) => {
                overlay.remove();
                resolve(value);
            };
            
            cancelBtn.addEventListener('click', () => close(null));
            confirmBtn.addEventListener('click', () => close(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });
        });
    }
    
    function showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'eq-modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'eq-modal';
            modal.innerHTML = `
                <div class="eq-modal-title">${title}</div>
                <div class="eq-modal-message">${message}</div>
                <div class="eq-modal-buttons">
                    <button class="eq-modal-btn" id="eq-modal-cancel">取消</button>
                    <button class="eq-modal-btn danger" id="eq-modal-confirm">确定</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            shadowRef.appendChild(overlay);
            
            const cancelBtn = modal.querySelector('#eq-modal-cancel');
            const confirmBtn = modal.querySelector('#eq-modal-confirm');
            
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
    
    async function saveCustomPreset(shadow) {
        const name = await showInputDialog('保存预设', '请输入预设名称');
        if (!name || !name.trim()) return;
        
        const preset = {
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            gains: [...State.gains],
            effects: { ...State.effects },
            createdAt: Date.now()
        };
        
        customPresets.push(preset);
        saveCustomPresets();
        
        State.preset = preset.id;
        
        createPresetButtons(shadow);
        updatePresetButtons(shadow);
        
        console.log('[MoeKoeEQ-Content] Saved custom preset:', name);
    }
    
    function updateCurrentPreset(shadow) {
        if (!State.preset.startsWith('custom_')) return;
        
        const preset = customPresets.find(p => p.id === State.preset);
        if (preset) {
            preset.gains = [...State.gains];
            preset.effects = { ...State.effects };
            preset.updatedAt = Date.now();
            saveCustomPresets();
            console.log('[MoeKoeEQ-Content] Updated custom preset:', preset.name);
        }
    }
    
    async function deleteCurrentPreset(shadow) {
        if (!State.preset.startsWith('custom_')) return;
        
        const presetIndex = customPresets.findIndex(p => p.id === State.preset);
        const presetName = customPresets[presetIndex]?.name;
        
        const confirmed = await showConfirmDialog('删除预设', `确定删除预设 "${presetName}" 吗？`);
        if (confirmed) {
            customPresets.splice(presetIndex, 1);
            saveCustomPresets();
            
            State.preset = 'flat';
            State.gains = Array(31).fill(0);
            
            createPresetButtons(shadow);
            updatePresetButtons(shadow);
            updateAllSliders(shadow);
            drawEQCurve(shadow);
            
            console.log('[MoeKoeEQ-Content] Deleted custom preset:', presetName);
        }
    }
    
    function togglePanel(shadow, visible) {
        const panel = shadow.getElementById('eq-panel');
        State.panelVisible = visible;
        
        if (visible) {
            panel.classList.add('visible');
            sendMessage('get-state', {});
            setTimeout(() => {
                drawEQCurve(shadow);
            }, 100);
        } else {
            panel.classList.remove('visible');
        }
    }
    
    function switchTab(shadow, tabName) {
        State.activeTab = tabName;
        
        const tabs = shadow.querySelectorAll('.eq-tab');
        const contents = shadow.querySelectorAll('.eq-tab-content');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        contents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
        
        if (tabName === 'eq') {
            setTimeout(() => drawEQCurve(shadow), 100);
        }
    }
    
    function sendMessage(type, data) {
        window.postMessage({
            source: '__moekoe_eq_content__',
            type,
            data
        }, window.location.origin);
    }
    
    function handleMainMessage(event) {
        if (event.source !== window) return;

        const { source, type, data } = event.data;

        if (source === '__moekoe_eq_popup__') {
            if (type === 'open-panel' && shadowRef) {
                togglePanel(shadowRef, true);
                const fab = shadowRef.getElementById('eq-fab');
                if (fab) {
                    fab.style.display = 'flex';
                }
            } else if (type === 'close-panel' && shadowRef) {
                togglePanel(shadowRef, false);
            }
            return;
        }
        
        if (source !== '__moekoe_eq_main__') return;
        
        if (!shadowRef) return;
        
        switch(type) {
            case 'state-change':
            case 'state-response':
                if (data) {
                    State.enabled = data.enabled !== false;
                    State.gains = data.gains || Array(31).fill(0);
                    State.preset = data.preset || 'flat';
                    State.mode = data.mode || 'waiting';
                    State.initialized = data.initialized || false;
                    State.effects = data.effects || { ...AUDIO_EFFECTS_DEFAULT };
                    State.effectsEnabled = data.effectsEnabled !== false;
                    
                    if (data.pluginDisabled !== undefined) {
                        State.pluginDisabled = data.pluginDisabled;
                    }
                    
                    const toggle = shadowRef.getElementById('eq-toggle-input');
                    if (toggle) toggle.checked = State.enabled;
                    
                    const effectsToggle = shadowRef.getElementById('effects-toggle-input');
                    if (effectsToggle) effectsToggle.checked = State.effectsEnabled;
                    
                    Object.keys(State.effects).forEach(key => {
                        updateEffectUI(shadowRef, key, State.effects[key]);
                    });
                    
                    updateAllSliders(shadowRef);
                    updatePresetButtons(shadowRef);
                    updateModeBadge(shadowRef);
                    updateFabBadge(shadowRef);
                    drawEQCurve(shadowRef);
                    
                    if (State.pluginDisabled) {
                        const fab = shadowRef.getElementById('eq-fab');
                        if (fab) fab.style.display = 'none';
                    }
                }
                break;
        }
    }
    
    function setupEventListeners(shadow, fab, panel) {
        fab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePanel(shadow, !State.panelVisible);
        });
        
        shadow.getElementById('eq-close-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePanel(shadow, false);
        });
        
        shadow.getElementById('eq-toggle-input').addEventListener('change', (e) => {
            toggleEQ(e.target.checked);
        });
        
        shadow.getElementById('effects-toggle-input').addEventListener('change', (e) => {
            toggleEffects(e.target.checked);
        });
        
        shadow.getElementById('eq-reset-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetEQ();
        });
        
        shadow.getElementById('btn-reset-effects').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetEffects();
        });
        
        shadow.getElementById('eq-save-preset-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveCustomPreset(shadow);
        });
        
        shadow.getElementById('btn-update-preset').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateCurrentPreset(shadow);
        });
        
        shadow.getElementById('btn-delete-preset').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteCurrentPreset(shadow);
        });
        
        shadow.querySelectorAll('.eq-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(shadow, tab.dataset.tab);
            });
        });
        
        window.addEventListener('message', handleMainMessage);

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('[MoeKoeEQ-Content] Received message:', message);
            
            if (message.source === '__moekoe_eq_popup__') {
                const fab = shadowRef ? shadowRef.getElementById('eq-fab') : null;
                switch (message.type) {
                    case 'show-fab':
                        if (fab) {
                            fab.style.display = 'flex';
                            State.pluginDisabled = false;
                            console.log('[MoeKoeEQ-Content] FAB button shown via popup');
                        }
                        break;
                    case 'hide-fab':
                        if (fab) {
                            fab.style.display = 'none';
                            State.pluginDisabled = true;
                            togglePanel(shadowRef, false);
                            console.log('[MoeKoeEQ-Content] FAB button hidden via popup');
                        }
                        break;
                }
                return;
            }
            
            if (message.source === '__moekoe_eq_background__') {
                switch (message.type) {
                    case 'toggle-eq':
                        State.enabled = message.data.enabled;
                        const toggle = shadow.getElementById('eq-toggle-input');
                        if (toggle) toggle.checked = State.enabled;
                        sendMessage('toggle-eq', { enabled: State.enabled });
                        updateModeBadge(shadow);
                        updateFabBadge(shadow);
                        break;
                    case 'toggle-plugin-disabled':
                        State.pluginDisabled = message.data.disabled;
                        saveSettingsToStorage();
                        sendMessage('plugin-disabled', { disabled: State.pluginDisabled });
                        if (State.pluginDisabled) {
                            fab.style.display = 'none';
                            togglePanel(shadow, false);
                        } else {
                            fab.style.display = 'flex';
                        }
                        break;
                    case 'reset-plugin':
                        resetPlugin(shadow, fab);
                        break;
                    case 'reset-eq':
                        State.preset = 'flat';
                        State.gains = Array(31).fill(0);
                        sendMessage('reset-eq', {});
                        updateAllSliders(shadow);
                        updatePresetButtons(shadow);
                        drawEQCurve(shadow);
                        break;
                    case 'apply-preset':
                        State.preset = message.data.preset;
                        State.gains = [...message.data.gains];
                        sendMessage('apply-preset', { preset: State.preset, gains: State.gains });
                        updateAllSliders(shadow);
                        updatePresetButtons(shadow);
                        drawEQCurve(shadow);
                        break;
                }
            }
        });
    }
    
    function init() {
        console.log('[MoeKoeEQ-Content] Creating UI...');
        
        loadCustomPresets();
        
        const { shadow, fab, panel } = createUI();
        
        chrome.runtime.sendMessage({ action: 'get-settings' }, (response) => {
            if (response && response.success && response.settings) {
                const settings = response.settings;
                State.enabled = settings.enabled !== false;
                State.gains = settings.gains || Array(31).fill(0);
                State.preset = settings.preset || 'flat';
                State.effects = { ...AUDIO_EFFECTS_DEFAULT, ...(settings.effects || {}) };
                State.effectsEnabled = settings.effectsEnabled !== false;
                State.pluginDisabled = settings.pluginDisabled || false;
                
                console.log('[MoeKoeEQ-Content] Initial settings loaded, pluginDisabled:', State.pluginDisabled);
                
                if (State.pluginDisabled) {
                    fab.style.display = 'none';
                    console.log('[MoeKoeEQ-Content] Plugin is disabled, hiding FAB on init');
                }
                
                createPresetButtons(shadow);
                createSliders(shadow);
                createEffectsControls(shadow);
                
                const eqToggle = shadow.getElementById('eq-toggle-input');
                if (eqToggle) eqToggle.checked = State.enabled;
                
                const effectsToggle = shadow.getElementById('effects-toggle-input');
                if (effectsToggle) effectsToggle.checked = State.effectsEnabled;
                
                Object.keys(State.effects).forEach(key => {
                    updateEffectUI(shadow, key, State.effects[key]);
                });
                
                updateAllSliders(shadow);
                updatePresetButtons(shadow);
                updateModeBadge(shadow);
                updateFabBadge(shadow);
                
                setupEventListeners(shadow, fab, panel);
                
                setTimeout(() => {
                    drawEQCurve(shadow);
                }, 100);
                
                setTimeout(() => {
                    sendMessage('get-state', {});
                }, 500);
                
                statePollingInterval = setInterval(() => {
                    if (State.panelVisible) {
                        sendMessage('get-state', {});
                    }
                }, 5000);
                
                window.addEventListener('beforeunload', () => {
                    if (statePollingInterval) {
                        clearInterval(statePollingInterval);
                        statePollingInterval = null;
                    }
                });
                
                console.log('[MoeKoeEQ-Content] UI created successfully');
            }
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
