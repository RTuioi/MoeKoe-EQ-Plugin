(function() {
    'use strict';
    
    if (window.__MOEKOE_EQ_MAIN__) {
        console.log('[MoeKoeEQ-MAIN] Already initialized, skipping');
        return;
    }
    window.__MOEKOE_EQ_MAIN__ = true;
    
    console.log('[MoeKoeEQ-MAIN] EQ Plugin initializing (standalone mode)...');
    
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
    
    let eqNodes = new Array(31).fill(null);
    let audioContext = null;
    let sourceNode = null;
    let eqInputNode = null;
    let eqOutputNode = null;
    let eqChainGain = null;
    let eqBypassGain = null;
    let currentGains = Array(31).fill(0);
    let currentPreset = 'flat';
    let isInitialized = false;
    let isEnabled = true;
    let pluginDisabled = false;
    let capturedAudioElement = null;
    let audioElementConnected = false;
    let failedAudioElements = new WeakSet();
    
    let effectsEnabled = true;
    let currentEffects = { ...AUDIO_EFFECTS_DEFAULT };
    
    let effectsNodes = {
        clarity: null,
        presence: null,
        dynamicBass: null,
        bassBoost: null,
        warmth: null,
        trebleBoost: null,
        vocalEnhance: null,
        dynamicEnhancer: null,
        dynamicEnhancerInput: null,
        ambianceDelay: null,
        ambianceGain: null,
        surroundDelayL: null,
        surroundDelayR: null,
        surroundFilterL: null,
        surroundFilterR: null,
        surroundGainL: null,
        surroundGainR: null,
        effectsBypassGain: null,
        effectsMixGain: null,
        outputGainNode: null,
        stereoPanner: null,
        reverbConvolver: null,
        reverbGain: null
    };
    
    function createEQNodes() {
        if (!audioContext) return;

        console.log('[MoeKoeEQ-MAIN] Creating 31 EQ nodes...');

        eqInputNode = audioContext.createGain();
        eqInputNode.gain.value = 1.0;

        eqOutputNode = audioContext.createGain();
        eqOutputNode.gain.value = 1.0;

        // EQ链路增益节点
        eqChainGain = audioContext.createGain();
        eqChainGain.gain.value = 1.0; // 默认EQ开启

        // 旁路增益节点
        eqBypassGain = audioContext.createGain();
        eqBypassGain.gain.value = 0.0; // 默认旁路关闭

        for (let i = 0; i < 31; i++) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = EQ_FREQUENCIES[i];
            filter.Q.value = 1.4;
            filter.gain.value = currentGains[i];
            eqNodes[i] = filter;
            console.log(`[MoeKoeEQ-MAIN] Created EQ node ${i + 1}/31: ${EQ_FREQUENCIES[i]}Hz`);
        }

        // EQ链路：input -> EQ nodes -> chainGain -> output
        eqInputNode.connect(eqNodes[0]);
        for (let i = 0; i < 30; i++) {
            eqNodes[i].connect(eqNodes[i + 1]);
        }
        eqNodes[30].connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);

        // 旁路链路：input -> bypassGain -> output
        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);

        console.log('[MoeKoeEQ-MAIN] All 31 EQ nodes created and connected with bypass');
    }
    
    function createReverbImpulse() {
        return new Promise((resolve) => {
            if (!audioContext) {
                resolve(null);
                return;
            }
            
            const sampleRate = audioContext.sampleRate;
            const length = sampleRate * 2;
            const impulse = audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    const decay = Math.exp(-3 * i / length);
                    channelData[i] = (Math.random() * 2 - 1) * decay;
                }
            }
            
            resolve(impulse);
        });
    }
    
    function initEffectsNodes() {
        if (!audioContext) return;
        
        try {
            effectsNodes.effectsBypassGain = audioContext.createGain();
            effectsNodes.effectsMixGain = audioContext.createGain();
            effectsNodes.effectsBypassGain.gain.value = 1.0;
            effectsNodes.effectsMixGain.gain.value = 0.0;
            
            effectsNodes.clarity = audioContext.createBiquadFilter();
            effectsNodes.clarity.type = 'highshelf';
            effectsNodes.clarity.frequency.value = 8000;
            effectsNodes.clarity.gain.value = (currentEffects.clarity / 100) * 12;
            
            effectsNodes.presence = audioContext.createBiquadFilter();
            effectsNodes.presence.type = 'peaking';
            effectsNodes.presence.frequency.value = 4000;
            effectsNodes.presence.Q.value = 1.0;
            effectsNodes.presence.gain.value = (currentEffects.presence / 100) * 10;
            
            effectsNodes.dynamicBass = audioContext.createBiquadFilter();
            effectsNodes.dynamicBass.type = 'lowshelf';
            effectsNodes.dynamicBass.frequency.value = 100;
            effectsNodes.dynamicBass.gain.value = (currentEffects.dynamicBass / 100) * 15;
            
            effectsNodes.bassBoost = audioContext.createBiquadFilter();
            effectsNodes.bassBoost.type = 'peaking';
            effectsNodes.bassBoost.frequency.value = 60;
            effectsNodes.bassBoost.Q.value = 1.5;
            effectsNodes.bassBoost.gain.value = (currentEffects.bassBoost / 100) * 12;
            
            effectsNodes.warmth = audioContext.createBiquadFilter();
            effectsNodes.warmth.type = 'peaking';
            effectsNodes.warmth.frequency.value = 250;
            effectsNodes.warmth.Q.value = 1.0;
            effectsNodes.warmth.gain.value = (currentEffects.warmth / 100) * 8;
            
            effectsNodes.trebleBoost = audioContext.createBiquadFilter();
            effectsNodes.trebleBoost.type = 'highshelf';
            effectsNodes.trebleBoost.frequency.value = 6000;
            effectsNodes.trebleBoost.gain.value = (currentEffects.trebleBoost / 100) * 10;
            
            effectsNodes.vocalEnhance = audioContext.createBiquadFilter();
            effectsNodes.vocalEnhance.type = 'peaking';
            effectsNodes.vocalEnhance.frequency.value = 3000;
            effectsNodes.vocalEnhance.Q.value = 1.2;
            effectsNodes.vocalEnhance.gain.value = (currentEffects.vocalEnhance / 100) * 8;
            
            effectsNodes.dynamicEnhancer = audioContext.createDynamicsCompressor();
            effectsNodes.dynamicEnhancer.threshold.value = -30;
            effectsNodes.dynamicEnhancer.knee.value = 40;
            effectsNodes.dynamicEnhancer.ratio.value = 6;
            effectsNodes.dynamicEnhancer.attack.value = 0.01;
            effectsNodes.dynamicEnhancer.release.value = 0.3;
            
            effectsNodes.dynamicEnhancerInput = audioContext.createGain();
            effectsNodes.dynamicEnhancerInput.gain.value = 1 + (currentEffects.dynamicEnhance / 100) * 0.5;
            
            effectsNodes.ambianceDelay = audioContext.createDelay(0.15);
            effectsNodes.ambianceDelay.delayTime.value = 0.035;
            effectsNodes.ambianceGain = audioContext.createGain();
            effectsNodes.ambianceGain.gain.value = (currentEffects.ambiance / 100) * 0.8;
            
            effectsNodes.surroundDelayL = audioContext.createDelay(0.15);
            effectsNodes.surroundDelayR = audioContext.createDelay(0.15);
            effectsNodes.surroundDelayL.delayTime.value = 0.025;
            effectsNodes.surroundDelayR.delayTime.value = 0.045;
            
            effectsNodes.surroundFilterL = audioContext.createBiquadFilter();
            effectsNodes.surroundFilterR = audioContext.createBiquadFilter();
            effectsNodes.surroundFilterL.type = 'highpass';
            effectsNodes.surroundFilterR.type = 'highpass';
            effectsNodes.surroundFilterL.frequency.value = 200;
            effectsNodes.surroundFilterR.frequency.value = 200;
            
            effectsNodes.surroundGainL = audioContext.createGain();
            effectsNodes.surroundGainR = audioContext.createGain();
            effectsNodes.surroundGainL.gain.value = (currentEffects.surround / 100) * 0.85;
            effectsNodes.surroundGainR.gain.value = (currentEffects.surround / 100) * 0.85;
            
            effectsNodes.outputGainNode = audioContext.createGain();
            effectsNodes.outputGainNode.gain.value = currentEffects.outputGain / 50;
            
            effectsNodes.stereoPanner = audioContext.createStereoPanner();
            effectsNodes.stereoPanner.pan.value = (currentEffects.stereoBalance - 50) / 50;
            
            effectsNodes.reverbConvolver = audioContext.createConvolver();
            effectsNodes.reverbGain = audioContext.createGain();
            effectsNodes.reverbGain.gain.value = (currentEffects.reverb / 100) * 0.5;
            
            if (effectsNodes.clarity && effectsNodes.presence) {
                effectsNodes.clarity.connect(effectsNodes.presence);
            }
            if (effectsNodes.presence && effectsNodes.bassBoost) {
                effectsNodes.presence.connect(effectsNodes.bassBoost);
            }
            if (effectsNodes.bassBoost && effectsNodes.trebleBoost) {
                effectsNodes.bassBoost.connect(effectsNodes.trebleBoost);
            }
            if (effectsNodes.trebleBoost && effectsNodes.vocalEnhance) {
                effectsNodes.trebleBoost.connect(effectsNodes.vocalEnhance);
            }
            if (effectsNodes.vocalEnhance && effectsNodes.warmth) {
                effectsNodes.vocalEnhance.connect(effectsNodes.warmth);
            }
            if (effectsNodes.warmth && effectsNodes.dynamicBass) {
                effectsNodes.warmth.connect(effectsNodes.dynamicBass);
            }
            if (effectsNodes.dynamicBass && effectsNodes.dynamicEnhancerInput) {
                effectsNodes.dynamicBass.connect(effectsNodes.dynamicEnhancerInput);
            }
            if (effectsNodes.dynamicEnhancerInput && effectsNodes.dynamicEnhancer) {
                effectsNodes.dynamicEnhancerInput.connect(effectsNodes.dynamicEnhancer);
            }
            
            if (effectsNodes.dynamicEnhancer && effectsNodes.ambianceDelay && effectsNodes.ambianceGain && effectsNodes.effectsMixGain) {
                effectsNodes.dynamicEnhancer.connect(effectsNodes.ambianceDelay);
                effectsNodes.ambianceDelay.connect(effectsNodes.ambianceGain);
                effectsNodes.ambianceGain.connect(effectsNodes.effectsMixGain);
            }
            
            if (effectsNodes.dynamicEnhancer && effectsNodes.surroundDelayL && effectsNodes.surroundDelayR) {
                effectsNodes.dynamicEnhancer.connect(effectsNodes.surroundDelayL);
                effectsNodes.dynamicEnhancer.connect(effectsNodes.surroundDelayR);
            }
            if (effectsNodes.surroundDelayL && effectsNodes.surroundFilterL && effectsNodes.surroundGainL && effectsNodes.effectsMixGain) {
                effectsNodes.surroundDelayL.connect(effectsNodes.surroundFilterL);
                effectsNodes.surroundFilterL.connect(effectsNodes.surroundGainL);
                effectsNodes.surroundGainL.connect(effectsNodes.effectsMixGain);
            }
            if (effectsNodes.surroundDelayR && effectsNodes.surroundFilterR && effectsNodes.surroundGainR && effectsNodes.effectsMixGain) {
                effectsNodes.surroundDelayR.connect(effectsNodes.surroundFilterR);
                effectsNodes.surroundFilterR.connect(effectsNodes.surroundGainR);
                effectsNodes.surroundGainR.connect(effectsNodes.effectsMixGain);
            }
            
            if (effectsNodes.dynamicEnhancer && effectsNodes.effectsMixGain) {
                effectsNodes.dynamicEnhancer.connect(effectsNodes.effectsMixGain);
            }
            
            console.log('[MoeKoeEQ-MAIN] Effects nodes created');
        } catch(e) {
            console.error('[MoeKoeEQ-MAIN] Failed to create effects nodes:', e);
        }
    }
    
    async function connectEQChain(audioElement) {
        if (isInitialized || !audioElement) return;
        
        if (failedAudioElements.has(audioElement)) {
            console.log('[MoeKoeEQ-MAIN] Audio element already failed before, skipping');
            return;
        }
        
        if (audioElementConnected) {
            console.log('[MoeKoeEQ-MAIN] Audio element already connected, skipping');
            return;
        }
        
        try {
            console.log('[MoeKoeEQ-MAIN] Initializing EQ chain for audio element...');
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[MoeKoeEQ-MAIN] AudioContext created, state:', audioContext.state);
            }
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log('[MoeKoeEQ-MAIN] AudioContext resumed');
            }
            
            createEQNodes();
            initEffectsNodes();
            
            try {
                sourceNode = audioContext.createMediaElementSource(audioElement);
                audioElementConnected = true;
                console.log('[MoeKoeEQ-MAIN] MediaElementSource created');
            } catch(e) {
                console.error('[MoeKoeEQ-MAIN] Failed to create MediaElementSource:', e);
                console.log('[MoeKoeEQ-MAIN] Audio element may already be connected to another AudioContext');
                failedAudioElements.add(audioElement);
                capturedAudioElement = audioElement;
                return;
            }
            
            sourceNode.connect(eqInputNode);
            
            eqOutputNode.connect(effectsNodes.effectsBypassGain);
            eqOutputNode.connect(effectsNodes.clarity);
            
            effectsNodes.effectsMixGain.connect(effectsNodes.outputGainNode);
            
            effectsNodes.effectsBypassGain.connect(effectsNodes.outputGainNode);
            effectsNodes.outputGainNode.connect(effectsNodes.stereoPanner);
            effectsNodes.stereoPanner.connect(audioContext.destination);
            
            createReverbImpulse().then(buffer => {
                if (effectsNodes.reverbConvolver && effectsNodes.reverbGain && buffer) {
                    effectsNodes.reverbConvolver.buffer = buffer;
                    try {
                        effectsNodes.effectsMixGain.connect(effectsNodes.reverbConvolver);
                        effectsNodes.reverbConvolver.connect(effectsNodes.reverbGain);
                        effectsNodes.reverbGain.connect(effectsNodes.outputGainNode);
                        console.log('[MoeKoeEQ-MAIN] Reverb connected successfully');
                    } catch(e) {
                        console.warn('[MoeKoeEQ-MAIN] Failed to connect reverb:', e);
                    }
                }
            }).catch(e => {
                console.warn('[MoeKoeEQ-MAIN] Failed to create reverb impulse:', e);
            });
            
            isInitialized = true;
            capturedAudioElement = audioElement;
            
            console.log('[MoeKoeEQ-MAIN] EQ chain connected successfully!');
            
            loadSettings();
            tryApplySettings();
            notifyStateChange();
            
        } catch(e) {
            console.error('[MoeKoeEQ-MAIN] Failed to connect EQ chain:', e);
        }
    }
    
    function setEffect(effectName, value) {
        currentEffects[effectName] = value;
        
        if (!audioContext) return;
        
        try {
            const ctx = audioContext;
            switch(effectName) {
                case 'clarity':
                    if (effectsNodes.clarity) effectsNodes.clarity.gain.setValueAtTime((value / 100) * 12, ctx.currentTime);
                    break;
                case 'presence':
                    if (effectsNodes.presence) effectsNodes.presence.gain.setValueAtTime((value / 100) * 10, ctx.currentTime);
                    break;
                case 'dynamicBass':
                    if (effectsNodes.dynamicBass) effectsNodes.dynamicBass.gain.setValueAtTime((value / 100) * 15, ctx.currentTime);
                    break;
                case 'bassBoost':
                    if (effectsNodes.bassBoost) effectsNodes.bassBoost.gain.setValueAtTime((value / 100) * 12, ctx.currentTime);
                    break;
                case 'warmth':
                    if (effectsNodes.warmth) effectsNodes.warmth.gain.setValueAtTime((value / 100) * 8, ctx.currentTime);
                    break;
                case 'trebleBoost':
                    if (effectsNodes.trebleBoost) effectsNodes.trebleBoost.gain.setValueAtTime((value / 100) * 10, ctx.currentTime);
                    break;
                case 'vocalEnhance':
                    if (effectsNodes.vocalEnhance) effectsNodes.vocalEnhance.gain.setValueAtTime((value / 100) * 8, ctx.currentTime);
                    break;
                case 'dynamicEnhance':
                    if (effectsNodes.dynamicEnhancerInput) effectsNodes.dynamicEnhancerInput.gain.setValueAtTime(1 + (value / 100) * 0.5, ctx.currentTime);
                    if (effectsNodes.dynamicEnhancer) {
                        const ratio = 4 + (value / 100) * 8;
                        effectsNodes.dynamicEnhancer.ratio.setValueAtTime(ratio, ctx.currentTime);
                        const threshold = -40 + (value / 100) * 20;
                        effectsNodes.dynamicEnhancer.threshold.setValueAtTime(threshold, ctx.currentTime);
                    }
                    break;
                case 'ambiance':
                    if (effectsNodes.ambianceGain) effectsNodes.ambianceGain.gain.setValueAtTime((value / 100) * 0.8, ctx.currentTime);
                    break;
                case 'surround':
                    if (effectsNodes.surroundGainL) effectsNodes.surroundGainL.gain.setValueAtTime((value / 100) * 0.85, ctx.currentTime);
                    if (effectsNodes.surroundGainR) effectsNodes.surroundGainR.gain.setValueAtTime((value / 100) * 0.85, ctx.currentTime);
                    break;
                case 'outputGain':
                    if (effectsNodes.outputGainNode) effectsNodes.outputGainNode.gain.setValueAtTime(value / 50, ctx.currentTime);
                    break;
                case 'stereoBalance':
                    if (effectsNodes.stereoPanner) effectsNodes.stereoPanner.pan.setValueAtTime((value - 50) / 50, ctx.currentTime);
                    break;
                case 'reverb':
                    if (effectsNodes.reverbGain) effectsNodes.reverbGain.gain.setValueAtTime((value / 100) * 0.5, ctx.currentTime);
                    break;
            }
        } catch(e) {
            console.error('[MoeKoeEQ-MAIN] setEffect error:', e);
        }
        
        saveSettings();
    }
    
    function toggleEffects(enabled) {
        effectsEnabled = enabled;
        
        if (effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain && audioContext) {
            const currentTime = audioContext.currentTime;
            effectsNodes.effectsBypassGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, currentTime);
            effectsNodes.effectsMixGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, currentTime);
            console.log('[MoeKoeEQ-MAIN] Effects toggled:', enabled);
        }
        
        saveSettings();
        notifyStateChange();
    }
    
    function resetEffects() {
        currentEffects = { ...AUDIO_EFFECTS_DEFAULT };
        
        Object.keys(AUDIO_EFFECTS_DEFAULT).forEach(key => {
            setEffect(key, AUDIO_EFFECTS_DEFAULT[key]);
        });
        
        saveSettings();
        notifyStateChange();
    }
    
    function setEQGain(bandIndex, gainDB) {
        if (bandIndex < 0 || bandIndex >= 31) return;
        
        const clampedGain = Math.max(-6, Math.min(6, gainDB));
        currentGains[bandIndex] = clampedGain;
        
        if (eqNodes[bandIndex] && audioContext) {
            try {
                eqNodes[bandIndex].gain.setValueAtTime(clampedGain, audioContext.currentTime);
            } catch(e) {}
        }
        
        saveSettings();
    }
    
    function setEQGains(gains) {
        if (!Array.isArray(gains) || gains.length !== 31) return;
        
        for (let i = 0; i < 31; i++) {
            const clampedGain = Math.max(-6, Math.min(6, gains[i]));
            currentGains[i] = clampedGain;
            
            if (eqNodes[i] && audioContext) {
                try {
                    eqNodes[i].gain.setValueAtTime(clampedGain, audioContext.currentTime);
                } catch(e) {}
            }
        }
        
        saveSettings();
    }
    
    function applyPreset(presetName, presetData) {
        let preset;
        
        if (presetName.startsWith('custom_') && presetData) {
            preset = presetData;
        } else if (!presetName.startsWith('custom_')) {
            preset = EQ_PRESETS[presetName];
        }
        
        if (!preset) return;
        
        currentPreset = presetName;
        setEQGains(preset.gains);
        
        if (preset.effects) {
            currentEffects = { ...AUDIO_EFFECTS_DEFAULT, ...preset.effects };
            effectsEnabled = true;
            
            Object.keys(preset.effects).forEach(key => {
                setEffect(key, preset.effects[key]);
            });
            
            if (effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain && audioContext) {
                const currentTime = audioContext.currentTime;
                effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, currentTime);
                effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, currentTime);
            }
        }
        
        saveSettings();
        notifyStateChange();
    }
    
    function resetEQ() {
        currentPreset = 'flat';
        setEQGains(Array(31).fill(0));
        saveSettings();
        notifyStateChange();
    }
    
    function resetPlugin() {
        console.log('[MoeKoeEQ-MAIN] Resetting plugin to initial state...');
        
        // 重置所有状态
        isEnabled = true;
        pluginDisabled = false;
        currentPreset = 'flat';
        currentGains = Array(31).fill(0);
        currentEffects = { ...AUDIO_EFFECTS_DEFAULT };
        effectsEnabled = true;
        
        // 重置 EQ
        setEQGains(Array(31).fill(0));
        
        // 重置音效
        resetEffects();
        
        // 确保 EQ 开启
        if (eqChainGain && eqBypassGain && audioContext) {
            const currentTime = audioContext.currentTime;
            eqChainGain.gain.setValueAtTime(1.0, currentTime);
            eqBypassGain.gain.setValueAtTime(0.0, currentTime);
        }
        
        // 清除存储
        try {
            localStorage.removeItem('__moekoe_eq_main_settings');
        } catch(e) {}
        
        saveSettings();
        notifyStateChange();
        
        console.log('[MoeKoeEQ-MAIN] Plugin reset complete');
    }
    
    function setPluginDisabled(disabled) {
        pluginDisabled = disabled;
        console.log('[MoeKoeEQ-MAIN] Plugin disabled:', disabled);
        
        if (disabled) {
            // 禁用插件：关闭 EQ 和音效，使用旁路
            if (eqChainGain && eqBypassGain && audioContext) {
                const currentTime = audioContext.currentTime;
                eqChainGain.gain.setValueAtTime(0.0, currentTime);
                eqBypassGain.gain.setValueAtTime(1.0, currentTime);
            }
            
            // 禁用音效
            if (effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain && audioContext) {
                const currentTime = audioContext.currentTime;
                effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, currentTime);
                effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, currentTime);
            }
        } else {
            // 启用插件：恢复 EQ 和音效状态
            if (eqChainGain && eqBypassGain && audioContext) {
                const currentTime = audioContext.currentTime;
                if (isEnabled) {
                    eqChainGain.gain.setValueAtTime(1.0, currentTime);
                    eqBypassGain.gain.setValueAtTime(0.0, currentTime);
                } else {
                    eqChainGain.gain.setValueAtTime(0.0, currentTime);
                    eqBypassGain.gain.setValueAtTime(1.0, currentTime);
                }
            }
            
            // 恢复音效状态
            if (effectsEnabled && effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain && audioContext) {
                const currentTime = audioContext.currentTime;
                effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, currentTime);
                effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, currentTime);
            }
        }
        
        saveSettings();
        notifyStateChange();
    }
    
    function toggleEQ(enabled) {
        isEnabled = enabled;

        if (eqChainGain && eqBypassGain && audioContext) {
            const currentTime = audioContext.currentTime;
            if (enabled) {
                // EQ开启：EQ链路增益为1，旁路增益为0
                eqChainGain.gain.setValueAtTime(1.0, currentTime);
                eqBypassGain.gain.setValueAtTime(0.0, currentTime);
            } else {
                // EQ关闭：EQ链路增益为0，旁路增益为1
                eqChainGain.gain.setValueAtTime(0.0, currentTime);
                eqBypassGain.gain.setValueAtTime(1.0, currentTime);
            }
            console.log('[MoeKoeEQ-MAIN] EQ toggled:', enabled);
        }

        saveSettings();
        notifyStateChange();
    }
    
    function saveSettings() {
        try {
            const settings = {
                enabled: isEnabled,
                gains: currentGains,
                preset: currentPreset,
                effects: currentEffects,
                effectsEnabled: effectsEnabled,
                pluginDisabled: pluginDisabled,
                timestamp: Date.now()
            };
            localStorage.setItem('__moekoe_eq_main_settings', JSON.stringify(settings));
        } catch(e) {
            console.error('[MoeKoeEQ-MAIN] Save settings error:', e);
        }
    }
    
    function loadSettings() {
        try {
            const saved = localStorage.getItem('__moekoe_eq_main_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                isEnabled = settings.enabled !== false;
                currentGains = settings.gains || Array(31).fill(0);
                currentPreset = settings.preset || 'flat';
                currentEffects = { ...AUDIO_EFFECTS_DEFAULT, ...(settings.effects || {}) };
                effectsEnabled = settings.effectsEnabled !== false;
                pluginDisabled = settings.pluginDisabled || false;
                console.log('[MoeKoeEQ-MAIN] Settings loaded, preset:', currentPreset, 'pluginDisabled:', pluginDisabled);
            }
        } catch(e) {
            console.error('[MoeKoeEQ-MAIN] Load settings error:', e);
        }
    }
    
    function notifyStateChange() {
        window.postMessage({
            source: '__moekoe_eq_main__',
            type: 'state-change',
            data: getState()
        }, window.location.origin);
    }
    
    function getState() {
        return {
            enabled: isEnabled,
            gains: currentGains,
            preset: currentPreset,
            mode: isInitialized ? 'main' : 'waiting',
            initialized: isInitialized,
            effects: currentEffects,
            effectsEnabled: effectsEnabled,
            pluginDisabled: pluginDisabled
        };
    }
    
    function tryApplySettings() {
        if (isInitialized && audioContext) {
            console.log('[MoeKoeEQ-MAIN] Applying saved settings...');

            if (pluginDisabled) {
                console.log('[MoeKoeEQ-MAIN] Plugin is disabled, applying bypass...');
                if (eqChainGain && eqBypassGain) {
                    const currentTime = audioContext.currentTime;
                    eqChainGain.gain.setValueAtTime(0.0, currentTime);
                    eqBypassGain.gain.setValueAtTime(1.0, currentTime);
                }
                if (effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain) {
                    const currentTime = audioContext.currentTime;
                    effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, currentTime);
                    effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, currentTime);
                }
                return;
            }

            if (eqChainGain && eqBypassGain) {
                const currentTime = audioContext.currentTime;
                if (isEnabled) {
                    eqChainGain.gain.setValueAtTime(1.0, currentTime);
                    eqBypassGain.gain.setValueAtTime(0.0, currentTime);
                } else {
                    eqChainGain.gain.setValueAtTime(0.0, currentTime);
                    eqBypassGain.gain.setValueAtTime(1.0, currentTime);
                }
            }

            currentGains.forEach((gain, i) => {
                if (eqNodes[i]) {
                    try {
                        eqNodes[i].gain.setValueAtTime(gain, audioContext.currentTime);
                    } catch(e) {}
                }
            });

            Object.keys(currentEffects).forEach(key => {
                setEffect(key, currentEffects[key]);
            });

            if (effectsEnabled && effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain) {
                const currentTime = audioContext.currentTime;
                effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, currentTime);
                effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, currentTime);
            }

            console.log('[MoeKoeEQ-MAIN] Settings applied successfully, EQ enabled:', isEnabled);
        }
    }
    
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        const result = originalPlay.apply(this, arguments);
        
        if (this.tagName === 'AUDIO' && !isInitialized && this.src) {
            console.log('[MoeKoeEQ-MAIN] Audio element play() detected, src:', this.src);
            
            const initEQ = () => {
                if (!isInitialized) {
                    connectEQChain(this);
                }
            };
            
            if (result && typeof result.then === 'function') {
                result.then(initEQ).catch(() => {});
            } else {
                setTimeout(initEQ, 50);
            }
        }
        
        return result;
    };
    
    function findAndConnectAudioElement() {
        if (isInitialized) return;
        
        const audioElements = document.querySelectorAll('audio');
        for (const audio of audioElements) {
            if (audio.src && !audio.paused) {
                console.log('[MoeKoeEQ-MAIN] Found playing audio element');
                connectEQChain(audio);
                return;
            }
        }
        
        for (const audio of audioElements) {
            if (audio.src) {
                console.log('[MoeKoeEQ-MAIN] Found audio element with src');
                connectEQChain(audio);
                return;
            }
        }
    }
    
    const observer = new MutationObserver((mutations) => {
        if (isInitialized) return;
        
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'AUDIO') {
                    console.log('[MoeKoeEQ-MAIN] Audio element added to DOM');
                    if (node.src && !isInitialized) {
                        setTimeout(() => connectEQChain(node), 100);
                    }
                } else if (node.querySelectorAll) {
                    const audios = node.querySelectorAll('audio');
                    if (audios.length > 0) {
                        console.log('[MoeKoeEQ-MAIN] Audio elements found in added subtree');
                        for (const audio of audios) {
                            if (audio.src && !isInitialized) {
                                setTimeout(() => connectEQChain(audio), 100);
                                break;
                            }
                        }
                    }
                }
            }
        }
    });
    
    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });
    
    loadSettings();
    
    setTimeout(findAndConnectAudioElement, 500);
    setTimeout(findAndConnectAudioElement, 1000);
    setTimeout(findAndConnectAudioElement, 2000);
    setTimeout(findAndConnectAudioElement, 3000);
    
    window.__MOEKOE_AUDIO__ = {
        toggleEQ,
        setEQGain,
        setEQGains,
        applyPreset,
        resetEQ,
        getState,
        getFrequencies: () => EQ_FREQUENCIES,
        getPresets: () => EQ_PRESETS,
        setEffect,
        toggleEffects,
        resetEffects
    };
    
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        const { source, type, data } = event.data;
        if (source !== '__moekoe_eq_content__') return;
        
        switch(type) {
            case 'toggle-eq':
                if (pluginDisabled) return;
                toggleEQ(data.enabled);
                break;
            case 'set-gain':
                if (pluginDisabled) return;
                setEQGain(data.index, data.gain);
                break;
            case 'set-gains':
                if (pluginDisabled) return;
                setEQGains(data.gains);
                break;
            case 'apply-preset':
                if (pluginDisabled) return;
                applyPreset(data.preset, data.presetData);
                break;
            case 'reset-eq':
                if (pluginDisabled) return;
                resetEQ();
                break;
            case 'reset-plugin':
                resetPlugin();
                break;
            case 'plugin-disabled':
                setPluginDisabled(data.disabled);
                break;
            case 'get-state':
                window.postMessage({
                    source: '__moekoe_eq_main__',
                    type: 'state-response',
                    data: getState()
                }, window.location.origin);
                break;
            case 'set-effect':
                if (pluginDisabled) return;
                setEffect(data.effect, data.value);
                break;
            case 'toggle-effects':
                if (pluginDisabled) return;
                toggleEffects(data.enabled);
                break;
            case 'reset-effects':
                if (pluginDisabled) return;
                resetEffects();
                break;
        }
    });
    
    let stateBroadcastInterval = null;
    
    function startStateBroadcast() {
        if (stateBroadcastInterval) return;
        stateBroadcastInterval = setInterval(() => {
            window.postMessage({
                source: '__moekoe_eq_main__',
                type: 'state-response',
                data: getState()
            }, window.location.origin);
        }, 5000);
    }
    
    function stopStateBroadcast() {
        if (stateBroadcastInterval) {
            clearInterval(stateBroadcastInterval);
            stateBroadcastInterval = null;
        }
    }
    
    startStateBroadcast();
    
    window.addEventListener('beforeunload', () => {
        stopStateBroadcast();
        saveSettings();
    });
    
    window.addEventListener('pagehide', () => {
        stopStateBroadcast();
    });
    
    console.log('[MoeKoeEQ-MAIN] EQ Plugin ready (standalone mode) - will intercept audio elements');
    
})();
