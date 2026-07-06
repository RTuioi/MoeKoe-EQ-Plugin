(function() {
    'use strict';

    if (window.__MOEKOE_EQ_MAIN__) return;

    var _hash = window.location.hash || '';
    var _pathname = window.location.pathname || '';
    if (_hash.indexOf('lyrics') >= 0 || _hash.indexOf('Lyrics') >= 0 || _pathname.indexOf('/lyrics') >= 0) {
        console.log('[MoeKoeEQ-MAIN] Desktop lyrics window detected, skipping EQ initialization');
        return;
    }

    window.__MOEKOE_EQ_MAIN__ = true;

    var _msgTargetOrigin = window.location.origin || '*';

    // === FALLBACK 常量 ===
    // 注意：完整定义见 shared/constants.js。修改 shared/constants.js 时务必同步更新此处的 fallback，
    // 并同步更新 background.js 和 content.js 中的 fallback 块。
    if (typeof EQ_FREQUENCIES === 'undefined') {
        window.EQ_FREQUENCIES = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
        window.EQ_PRESETS = { flat:{name:'平坦',gains:Array(31).fill(0)} };
        window.AUDIO_EFFECTS_DEFAULT = {bassBoost:0,dynamicBass:0,warmth:0,vocalEnhance:0,presence:0,clarity:0,trebleBoost:0,dynamicEnhance:0,ambiance:0,surround:0,reverb:0,outputGain:50,stereoBalance:50,loudnessCompensation:0,harmonicExciter:0,crossfeed:0,subHarmonic:0,tubeSaturation:0,multibandComp:0,deEsser:0,stereoWidener:0,tapeEmulation:0,loudnessMaximizer:0};
        window.DYNAMIC_EQ_DEFAULT = {enabled:false,threshold:-30,ratio:6,attack:0.02,release:0.15};
        window.LIMITER_DEFAULT = {threshold:-3,knee:0,ratio:4,attack:0.005,release:0.15};
        window.DC_FILTER_DEFAULT = {enabled:true,cutoffFreq:20,Q:0.707};
        window.TRUE_PEAK_LIMITER_DEFAULT = {enabled:true,threshold:-1.0,ceiling:-0.5,release:0.1,oversample:4};
        window.DITHER_DEFAULT = {enabled:false,targetBits:16,noiseShaping:true};
        window.MULTIBAND_COMPRESSOR_PRO_DEFAULT = {enabled:false,bands:[{freqMax:150,threshold:-20,ratio:3,attack:0.010,release:0.150,makeup:1.0,knee:6},{freqMax:1500,threshold:-20,ratio:3,attack:0.005,release:0.100,makeup:1.0,knee:6},{freqMax:6000,threshold:-20,ratio:3,attack:0.003,release:0.080,makeup:1.0,knee:6},{freqMax:24000,threshold:-20,ratio:3,attack:0.001,release:0.050,makeup:1.0,knee:6}]};
        window.AUTO_EQ_DEFAULT = {targetCurve:'custom',smoothing:3,perceptualWeighting:true,loudnessNormalize:true,maxGainDB:6,matchIterations:1};
        window.SHARE_CODE_VERSION = '2.0';
        window.SHARE_CODE_PREFIX = 'MEQ:';
        window.DEFAULT_SETTINGS = {enabled:true,gains:Array(31).fill(0),qValues:Array(31).fill(1.4),preset:'flat',pluginDisabled:false,effects:null,effectsEnabled:true,channelMode:'stereo',leftGains:Array(31).fill(0),rightGains:Array(31).fill(0),leftQValues:Array(31).fill(1.4),rightQValues:Array(31).fill(1.4),dynamicEQ:null,midSideEnabled:false,midGains:Array(31).fill(0),sideGains:Array(31).fill(0),linearPhaseEnabled:false,referenceProfile:null,dcFilter:null,dither:null,truePeakLimiter:null};
        window.MSG_SRC = {CONTENT:'__moekoe_eq_content__',MAIN:'__moekoe_eq_main__',BACKGROUND:'__moekoe_eq_background__',POPUP:'__moekoe_eq_popup__'};
        window.Q_VALUE_MIN = 0.1; window.Q_VALUE_MAX = 18.0; window.Q_VALUE_DEFAULT = 1.4; window.Q_VALUE_STEP = 0.1;
        window.GAIN_MIN = -6; window.GAIN_MAX = 6; window.GAIN_STEP = 0.5;
        window.CHANNEL_MODES = ['stereo','left','right','independent'];
        window.REVERB_SEED_VALUES = [0.327,0.512,0.891,0.234,0.678,0.456,0.123,0.789,0.345,0.567,0.890,0.012,0.456,0.678,0.901,0.234,0.567,0.890,0.123,0.456,0.789,0.012,0.345,0.678,0.901,0.234,0.567,0.890,0.123,0.456,0.789,0.012];
        console.warn('[MoeKoeEQ-MAIN] constants.js not loaded, using inline fallback');
    }

    var audioContext = null;
    var sourceNode = null;
    var isInitialized = false;
    var isEnabled = true;
    var pluginDisabled = false;
    var capturedAudioElement = null;
    var audioElementConnected = false;
    var failedAudioElements = new Map();
    var FAILED_ELEMENT_RETRY_MS = 10000; // 10秒后允许重试

    function hasFailedAudioElement(el) {
        if (!failedAudioElements.has(el)) return false;
        var failTime = failedAudioElements.get(el);
        if (Date.now() - failTime > FAILED_ELEMENT_RETRY_MS) {
            failedAudioElements.delete(el);
            return false;
        }
        return true;
    }

    function markFailedAudioElement(el) {
        failedAudioElements.set(el, Date.now());
    }

    var currentGains = Array(31).fill(0);
    var currentQValues = Array(31).fill(Q_VALUE_DEFAULT);
    var currentPreset = 'flat';
    var currentEffects = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
    var effectsEnabled = true;
    var channelMode = 'stereo';
    var leftGains = Array(31).fill(0);
    var rightGains = Array(31).fill(0);
    var leftQValues = Array(31).fill(Q_VALUE_DEFAULT);
    var rightQValues = Array(31).fill(Q_VALUE_DEFAULT);
    var dynamicEQConfig = Object.assign({}, DYNAMIC_EQ_DEFAULT);
    var midSideEnabled = false;
    var midGains = Array(31).fill(0);
    var sideGains = Array(31).fill(0);
    var linearPhaseEnabled = false;
    var referenceProfile = null;

    // === 新增功能配置 ===
    var dcFilterConfig = Object.assign({}, DC_FILTER_DEFAULT);
    var truePeakLimiterConfig = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT);
    var ditherConfig = Object.assign({}, DITHER_DEFAULT);
    var multibandCompProConfig = Object.assign({}, MULTIBAND_COMPRESSOR_PRO_DEFAULT);
    var autoEQConfig = Object.assign({}, AUTO_EQ_DEFAULT);

    var eqNodes = new Array(31).fill(null);
    var leftEQNodes = new Array(31).fill(null);
    var rightEQNodes = new Array(31).fill(null);
    var midEQNodes = new Array(31).fill(null);
    var sideEQNodes = new Array(31).fill(null);
    var linearPhaseConvolver = null;
    var linearPhaseConvolverR = null;
    var linearPhaseCompensationGain = 1.0;
    var lpSplitter = null;
    var lpMerger = null;

    var eqInputNode = null;
    var eqOutputNode = null;
    var eqChainGain = null;
    var eqBypassGain = null;

    var channelSplitter = null;
    var channelMerger = null;
    var leftInputGain = null;
    var rightInputGain = null;
    var leftOutputGain = null;
    var rightOutputGain = null;

    var msEncoderL = null;
    var msEncoderR = null;
    var msDecoderMidL = null;
    var msDecoderSideL = null;
    var msDecoderMidR = null;
    var msDecoderSideR = null;
    var msMidSumGain = null;
    var msSideDiffGainL = null;
    var msSideDiffGainR = null;

    var effectsNodes = {
        clarity: null, presence: null, dynamicBass: null, bassBoost: null,
        warmth: null, trebleBoost: null, vocalEnhance: null,
        dynamicEnhancer: null, dynamicEnhancerInput: null,
        ambianceDelay: null, ambianceGain: null,
        surroundDelayL: null, surroundDelayR: null,
        surroundFilterL: null, surroundFilterR: null,
        surroundGainL: null, surroundGainR: null,
        effectsBypassGain: null, effectsMixGain: null,
        outputGainNode: null, stereoPanner: null,
        reverbConvolver: null, reverbGain: null,
        loudnessLow: null, loudnessHigh: null,
        limiter: null,
        harmonicExciterShaper: null, harmonicExciterHP: null, harmonicExciterMix: null,
        crossfeedSplitter: null, crossfeedMerger: null,
        crossfeedDelayL: null, crossfeedDelayR: null,
        crossfeedFilterL: null, crossfeedFilterR: null,
        crossfeedGainL: null, crossfeedGainR: null,
        subHarmonicShaper: null, subHarmonicLP: null, subHarmonicMix: null,
        tubeShaper: null, tubeMix: null,
        multibandLowComp: null, multibandMidComp: null, multibandHighComp: null,
        multibandLowXover: null, multibandMidXover: null, multibandHighXover: null,
        multibandLowGain: null, multibandMidGain: null, multibandHighGain: null,
        deEsserFilter: null,
        stereoWidenerSplitter: null,
        stereoWidenerLLGain: null,
        stereoWidenerRLGain: null,
        stereoWidenerLRGain: null,
        stereoWidenerRRGain: null,
        stereoWidenerMerger: null,
        tapeShaper: null, tapeLowShelf: null, tapeHighShelf: null, tapeMix: null,
        loudnessMaxComp: null,
        loudnessMaxMakeupGain: null
    };

    var analyserInput = null;
    var analyserOutput = null;
    var spectrumData = null;
    var spectrumOutputData = null;

    // === 新增功能节点 ===
    var dcFilterNode = null;             // DC 偏移过滤
    var truePeakOversampler = null;     // 真峰值过采样
    var truePeakCompressor = null;       // 真峰值限幅器
    var truePeakCeilingGain = null;      // 输出 ceiling
    var ditherShaperL = null;            // Dither 左声道
    var ditherShaperR = null;            // Dither 右声道
    var ditherSplitter = null;
    var ditherMerger = null;
    var ditherNoiseSource = null;        // Dither 噪声源（TPDF）
    var ditherNoiseGainL = null;          // Dither 左声道噪声增益
    var ditherNoiseGainR = null;          // Dither 右声道噪声增益
    var multibandProNodes = null;        // 多段压缩 pro 节点对象

    var dynamicEQAnalyser = null;
    var dynamicEQGainNodes = new Array(31).fill(null);
    var dynamicEQFrameId = null;

    var observer = null;
    var stateBroadcastInterval = null;
    var isDestroyed = false;
    var isInitializing = false;

    var ERROR_TYPES = {
        AUDIO_CONTEXT: 'audio_context_error',
        NODE_CONNECTION: 'node_connection_error',
        INITIALIZATION: 'initialization_error',
        PERMISSION: 'permission_error'
    };

    function notifyError(type, message, details) {
        console.error('[MoeKoeEQ-MAIN] Error:', type, message, details);
        if (!MSG_SRC) return;
        window.postMessage({
            source: MSG_SRC.MAIN,
            type: 'error',
            data: { errorType: type, message: message, details: details || null }
        }, _msgTargetOrigin);
    }

    function createBiquadFilter(type, freq, q, gain) {
        var f = audioContext.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        f.gain.value = gain;
        return f;
    }

    // === Dither 辅助函数 ===
    // 生成 TPDF（三角概率密度函数）噪声缓冲区
    function createDitherNoiseBuffer(bits) {
        var sampleRate = audioContext.sampleRate;
        var len = sampleRate * 2; // 2 秒噪声，循环播放
        var buf = audioContext.createBuffer(2, len, sampleRate);
        var lsb = 1 / Math.pow(2, bits - 1); // 1 LSB 对应的振幅
        for (var ch = 0; ch < 2; ch++) {
            var data = buf.getChannelData(ch);
            for (var i = 0; i < len; i++) {
                // TPDF：两个均匀分布随机数之差，振幅范围 ±1 LSB
                var r1 = Math.random() * 2 - 1;
                var r2 = Math.random() * 2 - 1;
                data[i] = (r1 + r2) * lsb * 0.5;
            }
        }
        return buf;
    }

    // 生成量化曲线（WaveShaper 用于位深量化）
    function createDitherCurve(bits, noiseShaping) {
        var size = 65536;
        var curve = new Float32Array(size);
        var steps = Math.pow(2, bits) - 1;
        var halfSteps = steps / 2;
        for (var i = 0; i < size; i++) {
            var x = (i / (size - 1)) * 2 - 1; // -1..1
            var q = Math.round(x * halfSteps) / halfSteps;
            // noiseShaping：轻微高频削减以模拟噪声整形效果
            if (noiseShaping) {
                q = q * 0.9999 + x * 0.0001;
            }
            curve[i] = q;
        }
        return curve;
    }

    // === 真峰值限幅器辅助函数 ===
    // 生成软限幅曲线（WaveShaper 用于真峰值限幅，配合 oversample 使用）
    // 使用 cubic Hermite 插值保证阈值处 C1 连续，避免导数跳变产生的高频失真
    function createTruePeakCurve(thresholdDB, ceilingDB) {
        var size = 65536;
        var curve = new Float32Array(size);
        var threshold = Math.pow(10, thresholdDB / 20);
        var ceiling = Math.pow(10, ceilingDB / 20);
        var range = 1 - threshold;
        // 保护：threshold >= 1 时恒等曲线（无非线性区域）
        if (range <= 0) {
            for (var j = 0; j < size; j++) {
                curve[j] = (j / (size - 1)) * 2 - 1;
            }
            return curve;
        }
        // Hermite 基函数系数（在 t=0 处导数=range 匹配线性区，t=1 处导数=0 硬上限）
        // shaped(t) = threshold * h00 + range * h10 + ceiling * h01
        // h00 = 2t³ - 3t² + 1, h10 = t³ - 2t² + t, h01 = -2t³ + 3t²
        for (var i = 0; i < size; i++) {
            var x = (i / (size - 1)) * 2 - 1; // -1..1
            var absX = Math.abs(x);
            var sign = x < 0 ? -1 : 1;
            if (absX <= threshold) {
                // 线性区域
                curve[i] = x;
            } else {
                // 阈值以上：Hermite 插值过渡到 ceiling
                var t = (absX - threshold) / range;
                if (t > 1) t = 1;
                var t2 = t * t;
                var t3 = t2 * t;
                var h00 = 2 * t3 - 3 * t2 + 1;
                var h10 = t3 - 2 * t2 + t;
                var h01 = -2 * t3 + 3 * t2;
                var shaped = threshold * h00 + range * h10 + ceiling * h01;
                curve[i] = sign * Math.min(shaped, ceiling);
            }
        }
        return curve;
    }

    function createEQChain(nodes, gains, qValues) {
        for (var i = 0; i < 31; i++) {
            nodes[i] = createBiquadFilter('peaking', EQ_FREQUENCIES[i], qValues[i], gains[i]);
        }
    }

    function connectEQChain(nodes, input, output) {
        input.connect(nodes[0]);
        for (var i = 0; i < 30; i++) {
            nodes[i].connect(nodes[i + 1]);
        }
        nodes[30].connect(output);
    }

    function updateEQNodeGains(nodes, gains) {
        if (!audioContext) return;
        var t = audioContext.currentTime;
        for (var i = 0; i < 31; i++) {
            if (nodes[i]) {
                nodes[i].gain.setValueAtTime(Math.max(GAIN_MIN, Math.min(GAIN_MAX, gains[i])), t);
            }
        }
    }

    function updateEQNodeQValues(nodes, qValues) {
        if (!audioContext) return;
        var t = audioContext.currentTime;
        for (var i = 0; i < 31; i++) {
            if (nodes[i]) {
                nodes[i].Q.setValueAtTime(Math.max(Q_VALUE_MIN, Math.min(Q_VALUE_MAX, qValues[i])), t);
            }
        }
    }

    function createBaseNodes() {
eqInputNode = audioContext.createGain();
        eqInputNode.gain.value = 1.0;
        eqOutputNode = audioContext.createGain();
        eqOutputNode.gain.value = 1.0;
        eqChainGain = audioContext.createGain();
        eqChainGain.gain.value = 1.0;
        eqBypassGain = audioContext.createGain();
        eqBypassGain.gain.value = 0.0;

        // DC 偏移过滤：始终创建节点，由 applyDCFilterConfig 根据 enabled 决定参数
        if (!dcFilterNode) {
            dcFilterNode = audioContext.createBiquadFilter();
            dcFilterNode.type = 'highpass';
            dcFilterNode.frequency.value = dcFilterConfig.cutoffFreq || DC_FILTER_DEFAULT.cutoffFreq;
            dcFilterNode.Q.value = dcFilterConfig.Q || DC_FILTER_DEFAULT.Q;
            applyDCFilterConfig();
        }

        channelSplitter = audioContext.createChannelSplitter(2);
        channelMerger = audioContext.createChannelMerger(2);
        leftInputGain = audioContext.createGain();
        leftInputGain.gain.value = 1.0;
        rightInputGain = audioContext.createGain();
        rightInputGain.gain.value = 1.0;
        leftOutputGain = audioContext.createGain();
        leftOutputGain.gain.value = 1.0;
        rightOutputGain = audioContext.createGain();
        rightOutputGain.gain.value = 1.0;

        msEncoderL = audioContext.createGain();
        msEncoderL.gain.value = 0.5;
        msEncoderR = audioContext.createGain();
        msEncoderR.gain.value = 0.5;
        msDecoderMidL = audioContext.createGain();
        msDecoderMidL.gain.value = 1.0;
        msDecoderSideL = audioContext.createGain();
        msDecoderSideL.gain.value = 1.0;
        msDecoderMidR = audioContext.createGain();
        msDecoderMidR.gain.value = 1.0;
        msDecoderSideR = audioContext.createGain();
        msDecoderSideR.gain.value = -1.0;
    }

    function createAllEQNodes() {
createEQChain(eqNodes, currentGains, currentQValues);
        createEQChain(leftEQNodes, leftGains, leftQValues);
        createEQChain(rightEQNodes, rightGains, rightQValues);
        createEQChain(midEQNodes, midGains, currentQValues);
        createEQChain(sideEQNodes, sideGains, currentQValues);
    }

    function buildStereoSignalPath() {
eqInputNode.connect(eqNodes[0]);
        for (var i = 0; i < 30; i++) eqNodes[i].connect(eqNodes[i + 1]);
        eqNodes[30].connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);
        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);
    }

    function buildIndependentChannelPath() {
eqInputNode.connect(channelSplitter);
        channelSplitter.connect(leftInputGain, 0);
        channelSplitter.connect(rightInputGain, 1);

        leftInputGain.connect(leftEQNodes[0]);
        for (var i = 0; i < 30; i++) leftEQNodes[i].connect(leftEQNodes[i + 1]);
        leftEQNodes[30].connect(leftOutputGain);

        rightInputGain.connect(rightEQNodes[0]);
        for (var i = 0; i < 30; i++) rightEQNodes[i].connect(rightEQNodes[i + 1]);
        rightEQNodes[30].connect(rightOutputGain);

        leftOutputGain.connect(channelMerger, 0, 0);
        rightOutputGain.connect(channelMerger, 0, 1);
        channelMerger.connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);

        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);
    }

    function buildMidSidePath() {
eqInputNode.connect(channelSplitter);
        channelSplitter.connect(msEncoderL, 0);
        channelSplitter.connect(msEncoderR, 1);

        if (!msMidSumGain) {
            msMidSumGain = audioContext.createGain();
            msMidSumGain.gain.value = 1.0;
        }
        if (!msSideDiffGainL) {
            msSideDiffGainL = audioContext.createGain();
            msSideDiffGainL.gain.value = 1.0;
        }
        if (!msSideDiffGainR) {
            msSideDiffGainR = audioContext.createGain();
            msSideDiffGainR.gain.value = -1.0;
        }

        msEncoderL.connect(msMidSumGain);
        msEncoderR.connect(msMidSumGain);
        msMidSumGain.connect(midEQNodes[0]);
        for (var i = 0; i < 30; i++) midEQNodes[i].connect(midEQNodes[i + 1]);
        midEQNodes[30].connect(msDecoderMidL);
        midEQNodes[30].connect(msDecoderMidR);

        msEncoderL.connect(msSideDiffGainL);
        msEncoderR.connect(msSideDiffGainR);
        msSideDiffGainL.connect(sideEQNodes[0]);
        msSideDiffGainR.connect(sideEQNodes[0]);
        for (var i = 0; i < 30; i++) sideEQNodes[i].connect(sideEQNodes[i + 1]);
        sideEQNodes[30].connect(msDecoderSideL);
        sideEQNodes[30].connect(msDecoderSideR);

        msDecoderMidL.connect(channelMerger, 0, 0);
        msDecoderSideL.connect(channelMerger, 0, 0);
        msDecoderMidR.connect(channelMerger, 0, 1);
        msDecoderSideR.connect(channelMerger, 0, 1);

        channelMerger.connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);
        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);
    }

    function buildLeftOnlyPath() {
        eqInputNode.connect(channelSplitter);
        channelSplitter.connect(leftInputGain, 0);
        leftInputGain.connect(eqNodes[0]);
        for (var i = 0; i < 30; i++) eqNodes[i].connect(eqNodes[i + 1]);
        eqNodes[30].connect(leftOutputGain);
        leftOutputGain.connect(channelMerger, 0, 0);
        channelMerger.connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);
        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);
    }

    function buildRightOnlyPath() {
        eqInputNode.connect(channelSplitter);
        channelSplitter.connect(rightInputGain, 1);
        rightInputGain.connect(eqNodes[0]);
        for (var i = 0; i < 30; i++) eqNodes[i].connect(eqNodes[i + 1]);
        eqNodes[30].connect(rightOutputGain);
        rightOutputGain.connect(channelMerger, 0, 1);
        channelMerger.connect(eqChainGain);
        eqChainGain.connect(eqOutputNode);
        eqInputNode.connect(eqBypassGain);
        eqBypassGain.connect(eqOutputNode);
    }

    function rebuildSignalPath() {
        if (!audioContext || !eqInputNode) return;

        var hadEffectsConnections = false;
        var savedEffectsBypassGain = effectsNodes.effectsBypassGain || null;
        var savedClarity = effectsNodes.clarity || null;
        var savedAnalyserOutput = analyserOutput || null;

        try { eqOutputNode.disconnect(); hadEffectsConnections = true; } catch (e) {}

        try {
            eqInputNode.disconnect();
            eqBypassGain.disconnect();
            eqChainGain.disconnect();
            if (channelSplitter) channelSplitter.disconnect();
            if (channelMerger) channelMerger.disconnect();
            if (leftInputGain) leftInputGain.disconnect();
            if (rightInputGain) rightInputGain.disconnect();
            if (leftOutputGain) leftOutputGain.disconnect();
            if (rightOutputGain) rightOutputGain.disconnect();
            if (msEncoderL) msEncoderL.disconnect();
            if (msEncoderR) msEncoderR.disconnect();
            if (msDecoderMidL) msDecoderMidL.disconnect();
            if (msDecoderSideL) msDecoderSideL.disconnect();
            if (msDecoderMidR) msDecoderMidR.disconnect();
            if (msDecoderSideR) msDecoderSideR.disconnect();
            if (msMidSumGain) msMidSumGain.disconnect();
            if (msSideDiffGainL) msSideDiffGainL.disconnect();
            if (msSideDiffGainR) msSideDiffGainR.disconnect();
            for (var i = 0; i < 31; i++) {
                try { if (eqNodes[i]) eqNodes[i].disconnect(); } catch (e) {}
                try { if (leftEQNodes[i]) leftEQNodes[i].disconnect(); } catch (e) {}
                try { if (rightEQNodes[i]) rightEQNodes[i].disconnect(); } catch (e) {}
                try { if (midEQNodes[i]) midEQNodes[i].disconnect(); } catch (e) {}
                try { if (sideEQNodes[i]) sideEQNodes[i].disconnect(); } catch (e) {}
            }
            if (linearPhaseConvolver) {
                try { linearPhaseConvolver.disconnect(); } catch (e) {}
                try { eqInputNode.disconnect(linearPhaseConvolver); } catch (e) {}
                linearPhaseConvolver = null;
            }
            if (linearPhaseConvolverR) {
                try { linearPhaseConvolverR.disconnect(); } catch (e) {}
                linearPhaseConvolverR = null;
            }
        } catch (e) { }

        if (midSideEnabled) {
            buildMidSidePath();
        } else if (channelMode === 'independent') {
            buildIndependentChannelPath();
        } else if (channelMode === 'left') {
            buildLeftOnlyPath();
        } else if (channelMode === 'right') {
            buildRightOnlyPath();
        } else {
            buildStereoSignalPath();
        }

        if (linearPhaseEnabled) {
            insertLinearPhaseConvolver();
        }

        if (hadEffectsConnections) {
            if (savedEffectsBypassGain) { try { eqOutputNode.connect(savedEffectsBypassGain); } catch (e) {} }
            if (savedClarity) { try { eqOutputNode.connect(savedClarity); } catch (e) {} }
            if (savedAnalyserOutput) { try { eqOutputNode.connect(savedAnalyserOutput); } catch (e) {} }
        }
    }

    function insertLinearPhaseConvolver() {
        if (!audioContext || !eqInputNode) return;
        if (midSideEnabled) {
            console.warn('[MoeKoeEQ-MAIN] 线性相位与 M/S 模式不兼容（卷积会破坏 M/S 解码），跳过线性相位插入');
            return;
        }
        try {
            var activeGains = getActiveGainsForLinearPhase();
            var impulse = generateLinearPhaseImpulse(activeGains);
            if (!impulse) return;

            if (!linearPhaseConvolver) {
                linearPhaseConvolver = audioContext.createConvolver();
                linearPhaseConvolver.normalize = false;
            }
            linearPhaseConvolver.buffer = impulse;

            if (!linearPhaseConvolverR) {
                linearPhaseConvolverR = audioContext.createConvolver();
                linearPhaseConvolverR.normalize = false;
            }

            if (midSideEnabled) {
                var sideImpulse = generateLinearPhaseImpulse(sideGains);
                linearPhaseConvolverR.buffer = sideImpulse || impulse;
            } else if (channelMode === 'independent') {
                var rightImpulse = generateLinearPhaseImpulse(rightGains);
                linearPhaseConvolverR.buffer = rightImpulse || impulse;
            } else {
                linearPhaseConvolverR.buffer = impulse;
            }

            var peakAmp = impulse._moekoePeakAmplitude || 1.0;
            var rms = impulse._moekoeRMS || 1.0;

            var hasGain = false;
            var maxGainAbs = 0;
            for (var gi = 0; gi < 31; gi++) {
                if (Math.abs(currentGains[gi]) > 0.01) {
                    hasGain = true;
                    if (Math.abs(currentGains[gi]) > maxGainAbs) {
                        maxGainAbs = Math.abs(currentGains[gi]);
                    }
                }
            }

            var compensationGain = 1.0;
            if (hasGain && peakAmp > 2.0) {
                compensationGain = 1.0 / Math.sqrt(peakAmp);
                compensationGain = Math.max(0.85, compensationGain);
            }
            linearPhaseCompensationGain = compensationGain;

            if (midSideEnabled) {
                try {
                    msDecoderMidL.disconnect();
                    msDecoderSideL.disconnect();
                    msDecoderMidR.disconnect();
                    msDecoderSideR.disconnect();
                    channelMerger.disconnect();

                    msDecoderMidL.connect(linearPhaseConvolver);
                    msDecoderSideL.connect(linearPhaseConvolver);
                    linearPhaseConvolver.connect(channelMerger, 0, 0);

                    msDecoderMidR.connect(linearPhaseConvolverR);
                    msDecoderSideR.connect(linearPhaseConvolverR);
                    linearPhaseConvolverR.connect(channelMerger, 0, 1);

                    channelMerger.connect(eqChainGain);

                    if (eqChainGain) eqChainGain.gain.setValueAtTime(compensationGain, audioContext.currentTime);
                    for (var mi = 0; mi < 31; mi++) {
                        if (midEQNodes[mi]) midEQNodes[mi].gain.setValueAtTime(0, audioContext.currentTime);
                        if (sideEQNodes[mi]) sideEQNodes[mi].gain.setValueAtTime(0, audioContext.currentTime);
                    }
                } catch (e) {
                    console.warn('[MoeKoeEQ-MAIN] Linear phase MS insert error:', e);
                }
            } else if (channelMode === 'independent') {
                try {
                    leftOutputGain.disconnect();
                    rightOutputGain.disconnect();
                    channelMerger.disconnect();

                    leftOutputGain.connect(linearPhaseConvolver);
                    linearPhaseConvolver.connect(channelMerger, 0, 0);

                    rightOutputGain.connect(linearPhaseConvolverR);
                    linearPhaseConvolverR.connect(channelMerger, 0, 1);

                    channelMerger.connect(eqChainGain);

                    if (eqChainGain) eqChainGain.gain.setValueAtTime(compensationGain, audioContext.currentTime);
                    for (var ii = 0; ii < 31; ii++) {
                        if (leftEQNodes[ii]) leftEQNodes[ii].gain.setValueAtTime(0, audioContext.currentTime);
                        if (rightEQNodes[ii]) rightEQNodes[ii].gain.setValueAtTime(0, audioContext.currentTime);
                    }
                } catch (e) {
                    console.warn('[MoeKoeEQ-MAIN] Linear phase independent insert error:', e);
                }
            } else {
                try {
                    try { eqNodes[30].disconnect(); } catch (e) {}
                    try { eqChainGain.disconnect(); } catch (e) {}
                    try { eqBypassGain.disconnect(); } catch (e) {}
                    try { eqInputNode.disconnect(); } catch (e) {}

                    if (lpSplitter) { try { lpSplitter.disconnect(); } catch (e) {} }
                    if (lpMerger) { try { lpMerger.disconnect(); } catch (e) {} }
                    lpSplitter = audioContext.createChannelSplitter(2);
                    lpMerger = audioContext.createChannelMerger(2);

                    eqInputNode.connect(lpSplitter);
                    lpSplitter.connect(linearPhaseConvolver, 0);
                    lpSplitter.connect(linearPhaseConvolverR, 1);
                    linearPhaseConvolver.connect(lpMerger, 0, 0);
                    linearPhaseConvolverR.connect(lpMerger, 0, 1);
                    lpMerger.connect(eqChainGain);
                    eqChainGain.connect(eqOutputNode);

                    eqInputNode.connect(eqBypassGain);
                    eqBypassGain.connect(eqOutputNode);

                    if (eqChainGain) eqChainGain.gain.setValueAtTime(compensationGain, audioContext.currentTime);
                    if (eqBypassGain) eqBypassGain.gain.setValueAtTime(0.0, audioContext.currentTime);
                    for (var si = 0; si < 31; si++) {
                        if (eqNodes[si]) eqNodes[si].gain.setValueAtTime(0, audioContext.currentTime);
                    }
                } catch (e) {
                    console.warn('[MoeKoeEQ-MAIN] Linear phase stereo insert error:', e);
                }
            }
        } catch (e) {
            console.warn('[MoeKoeEQ-MAIN] Linear phase insert error:', e);
        }
    }

    function generateHarmonicExciterCurve(amount) {
        var samples = 44100;
        var curve = new Float32Array(samples);
        var k = amount / 100 * 2;
        for (var i = 0; i < samples; i++) {
            var x = (i * 2) / samples - 1;
            if (k <= 0) { curve[i] = x; }
            else { curve[i] = (1 + k) * x - k * x * x * x; }
        }
        return curve;
    }

    function generateSubHarmonicCurve(amount) {
        var samples = 44100;
        var curve = new Float32Array(samples);
        var k = amount / 100;
        for (var i = 0; i < samples; i++) {
            var x = (i * 2) / samples - 1;
            if (k <= 0) { curve[i] = x; }
            else {
                var abs_x = Math.abs(x);
                var sign = x >= 0 ? 1 : -1;
                curve[i] = sign * (abs_x * (1 - k) + abs_x * abs_x * k);
            }
        }
        return curve;
    }

    function generateTubeSaturationCurve(amount) {
        var samples = 44100;
        var curve = new Float32Array(samples);
        var k = amount / 100 * 4;
        for (var i = 0; i < samples; i++) {
            var x = (i * 2) / samples - 1;
            if (k <= 0) { curve[i] = x; }
            else { curve[i] = (1 + k) * Math.tanh(x * (1 + k)) / Math.tanh(1 + k); }
        }
        return curve;
    }

    function generateTapeCurve(amount) {
        var samples = 44100;
        var curve = new Float32Array(samples);
        var k = amount / 100 * 3;
        for (var i = 0; i < samples; i++) {
            var x = (i * 2) / samples - 1;
            if (k <= 0) { curve[i] = x; }
            else {
                curve[i] = x + k * 0.15 * (Math.sin(Math.PI * x) - x);
            }
        }
        return curve;
    }

    function createReverbImpulse() {
        var sampleRate = audioContext.sampleRate;
        var length = sampleRate * 2;
        var impulse = audioContext.createBuffer(2, length, sampleRate);
        for (var ch = 0; ch < 2; ch++) {
            var data = impulse.getChannelData(ch);
            for (var i = 0; i < length; i++) {
                var decay = Math.exp(-3 * i / length);
                var seedIdx = i % REVERB_SEED_VALUES.length;
                data[i] = (REVERB_SEED_VALUES[seedIdx] * 2 - 1) * decay;
            }
        }
        return impulse;
    }

    function initEffectsNodes() {
        if (!audioContext) return;
try {
            var N = effectsNodes;
            N.effectsBypassGain = audioContext.createGain();
            N.effectsMixGain = audioContext.createGain();
            N.effectsBypassGain.gain.value = 1.0;
            N.effectsMixGain.gain.value = 0.0;

            N.clarity = createBiquadFilter('highshelf', 8000, 1.0, (currentEffects.clarity / 100) * 12);
            N.presence = createBiquadFilter('peaking', 4000, 1.0, (currentEffects.presence / 100) * 10);
            N.bassBoost = createBiquadFilter('peaking', 60, 1.5, (currentEffects.bassBoost / 100) * 12);
            N.trebleBoost = createBiquadFilter('highshelf', 6000, 1.0, (currentEffects.trebleBoost / 100) * 10);
            N.vocalEnhance = createBiquadFilter('peaking', 3000, 1.2, (currentEffects.vocalEnhance / 100) * 8);
            N.warmth = createBiquadFilter('peaking', 250, 1.0, (currentEffects.warmth / 100) * 8);
            N.dynamicBass = createBiquadFilter('lowshelf', 100, 1.0, (currentEffects.dynamicBass / 100) * 15);

            N.dynamicEnhancer = audioContext.createDynamicsCompressor();
            N.dynamicEnhancer.threshold.value = 0;
            N.dynamicEnhancer.knee.value = 0;
            N.dynamicEnhancer.ratio.value = 1;
            N.dynamicEnhancer.attack.value = 0.01;
            N.dynamicEnhancer.release.value = 0.3;

            N.dynamicEnhancerInput = audioContext.createGain();
            N.dynamicEnhancerInput.gain.value = 1 + (currentEffects.dynamicEnhance / 100) * 0.5;

            N.ambianceDelay = audioContext.createDelay(0.15);
            N.ambianceDelay.delayTime.value = 0.035;
            N.ambianceGain = audioContext.createGain();
            N.ambianceGain.gain.value = (currentEffects.ambiance / 100) * 0.8;

            N.surroundDelayL = audioContext.createDelay(0.15);
            N.surroundDelayR = audioContext.createDelay(0.15);
            N.surroundDelayL.delayTime.value = 0.025;
            N.surroundDelayR.delayTime.value = 0.045;

            N.surroundFilterL = createBiquadFilter('highpass', 200, 1.0, 0);
            N.surroundFilterR = createBiquadFilter('highpass', 200, 1.0, 0);

            N.surroundGainL = audioContext.createGain();
            N.surroundGainR = audioContext.createGain();
            N.surroundGainL.gain.value = (currentEffects.surround / 100) * 0.85;
            N.surroundGainR.gain.value = (currentEffects.surround / 100) * 0.85;

            N.outputGainNode = audioContext.createGain();
            N.outputGainNode.gain.value = currentEffects.outputGain / 50;

            N.stereoPanner = audioContext.createStereoPanner();
            N.stereoPanner.pan.value = (currentEffects.stereoBalance - 50) / 50;

            N.reverbConvolver = audioContext.createConvolver();
            N.reverbGain = audioContext.createGain();
            N.reverbGain.gain.value = (currentEffects.reverb / 100) * 0.5;

            N.loudnessLow = createBiquadFilter('lowshelf', 200, 1.0, 0);
            N.loudnessHigh = createBiquadFilter('highshelf', 6000, 1.0, 0);

            N.limiter = audioContext.createDynamicsCompressor();
            N.limiter.threshold.value = LIMITER_DEFAULT.threshold;
            N.limiter.knee.value = LIMITER_DEFAULT.knee;
            N.limiter.ratio.value = LIMITER_DEFAULT.ratio;
            N.limiter.attack.value = LIMITER_DEFAULT.attack;
            N.limiter.release.value = LIMITER_DEFAULT.release;

            N.clarity.connect(N.presence);
            N.presence.connect(N.bassBoost);
            N.bassBoost.connect(N.trebleBoost);
            N.trebleBoost.connect(N.vocalEnhance);
            N.vocalEnhance.connect(N.warmth);
            N.warmth.connect(N.dynamicBass);
            N.dynamicBass.connect(N.dynamicEnhancerInput);
            N.dynamicEnhancerInput.connect(N.dynamicEnhancer);

            N.dynamicEnhancer.connect(N.ambianceDelay);
            N.ambianceDelay.connect(N.ambianceGain);
            N.ambianceGain.connect(N.effectsMixGain);

            N.dynamicEnhancer.connect(N.surroundDelayL);
            N.dynamicEnhancer.connect(N.surroundDelayR);
            N.surroundDelayL.connect(N.surroundFilterL);
            N.surroundFilterL.connect(N.surroundGainL);
            N.surroundGainL.connect(N.effectsMixGain);
            N.surroundDelayR.connect(N.surroundFilterR);
            N.surroundFilterR.connect(N.surroundGainR);
            N.surroundGainR.connect(N.effectsMixGain);

            N.dynamicEnhancer.connect(N.effectsMixGain);

            N.harmonicExciterHP = createBiquadFilter('highpass', 4000, 1.0, 0);
            N.harmonicExciterShaper = audioContext.createWaveShaper();
            N.harmonicExciterShaper.curve = generateHarmonicExciterCurve(0);
            N.harmonicExciterShaper.oversample = '4x';
            N.harmonicExciterMix = audioContext.createGain();
            N.harmonicExciterMix.gain.value = 0;
            N.dynamicEnhancer.connect(N.harmonicExciterHP);
            N.harmonicExciterHP.connect(N.harmonicExciterShaper);
            N.harmonicExciterShaper.connect(N.harmonicExciterMix);
            N.harmonicExciterMix.connect(N.effectsMixGain);

            N.subHarmonicShaper = audioContext.createWaveShaper();
            N.subHarmonicShaper.curve = generateSubHarmonicCurve(0);
            N.subHarmonicShaper.oversample = '4x';
            N.subHarmonicLP = createBiquadFilter('lowpass', 120, 1.0, 0);
            N.subHarmonicMix = audioContext.createGain();
            N.subHarmonicMix.gain.value = 0;
            N.dynamicEnhancer.connect(N.subHarmonicShaper);
            N.subHarmonicShaper.connect(N.subHarmonicLP);
            N.subHarmonicLP.connect(N.subHarmonicMix);
            N.subHarmonicMix.connect(N.effectsMixGain);

            N.tubeShaper = audioContext.createWaveShaper();
            N.tubeShaper.curve = generateTubeSaturationCurve(0);
            N.tubeShaper.oversample = '4x';
            N.tubeMix = audioContext.createGain();
            N.tubeMix.gain.value = 0;
            N.dynamicEnhancer.connect(N.tubeShaper);
            N.tubeShaper.connect(N.tubeMix);
            N.tubeMix.connect(N.effectsMixGain);

            N.multibandLowXover = createBiquadFilter('lowpass', 300, 0.7, 0);
            N.multibandMidXover = createBiquadFilter('bandpass', 1000, 0.5, 0);
            N.multibandHighXover = createBiquadFilter('highpass', 3000, 0.7, 0);
            N.multibandLowComp = audioContext.createDynamicsCompressor();
            N.multibandMidComp = audioContext.createDynamicsCompressor();
            N.multibandHighComp = audioContext.createDynamicsCompressor();
            N.multibandLowComp.threshold.value = -20; N.multibandLowComp.ratio.value = 3; N.multibandLowComp.attack.value = 0.01; N.multibandLowComp.release.value = 0.1;
            N.multibandMidComp.threshold.value = -20; N.multibandMidComp.ratio.value = 3; N.multibandMidComp.attack.value = 0.005; N.multibandMidComp.release.value = 0.05;
            N.multibandHighComp.threshold.value = -20; N.multibandHighComp.ratio.value = 3; N.multibandHighComp.attack.value = 0.001; N.multibandHighComp.release.value = 0.05;
            N.multibandLowGain = audioContext.createGain(); N.multibandLowGain.gain.value = 0;
            N.multibandMidGain = audioContext.createGain(); N.multibandMidGain.gain.value = 0;
            N.multibandHighGain = audioContext.createGain(); N.multibandHighGain.gain.value = 0;
            N.dynamicEnhancer.connect(N.multibandLowXover);
            N.dynamicEnhancer.connect(N.multibandMidXover);
            N.dynamicEnhancer.connect(N.multibandHighXover);
            N.multibandLowXover.connect(N.multibandLowComp);
            N.multibandMidXover.connect(N.multibandMidComp);
            N.multibandHighXover.connect(N.multibandHighComp);
            N.multibandLowComp.connect(N.multibandLowGain);
            N.multibandMidComp.connect(N.multibandMidGain);
            N.multibandHighComp.connect(N.multibandHighGain);
            N.multibandLowGain.connect(N.effectsMixGain);
            N.multibandMidGain.connect(N.effectsMixGain);
            N.multibandHighGain.connect(N.effectsMixGain);

            N.tapeShaper = audioContext.createWaveShaper();
            N.tapeShaper.curve = generateTapeCurve(0);
            N.tapeShaper.oversample = '4x';
            N.tapeLowShelf = createBiquadFilter('lowshelf', 80, 1.0, 0);
            N.tapeHighShelf = createBiquadFilter('highshelf', 10000, 1.0, 0);
            N.tapeMix = audioContext.createGain();
            N.tapeMix.gain.value = 0;
            N.dynamicEnhancer.connect(N.tapeShaper);
            N.tapeShaper.connect(N.tapeLowShelf);
            N.tapeLowShelf.connect(N.tapeHighShelf);
            N.tapeHighShelf.connect(N.tapeMix);
            N.tapeMix.connect(N.effectsMixGain);

            N.crossfeedSplitter = audioContext.createChannelSplitter(2);
            N.crossfeedMerger = audioContext.createChannelMerger(2);
            N.crossfeedDelayL = audioContext.createDelay(0.05);
            N.crossfeedDelayR = audioContext.createDelay(0.05);
            N.crossfeedDelayL.delayTime.value = 0.00025;
            N.crossfeedDelayR.delayTime.value = 0.00025;
            N.crossfeedFilterL = createBiquadFilter('lowpass', 2000, 0.7, 0);
            N.crossfeedFilterR = createBiquadFilter('lowpass', 2000, 0.7, 0);
            N.crossfeedGainL = audioContext.createGain();
            N.crossfeedGainR = audioContext.createGain();
            N.crossfeedGainL.gain.value = 0;
            N.crossfeedGainR.gain.value = 0;

            N.stereoWidenerSplitter = audioContext.createChannelSplitter(2);
            N.stereoWidenerMerger = audioContext.createChannelMerger(2);
            N.stereoWidenerLLGain = audioContext.createGain();
            N.stereoWidenerLLGain.gain.value = 1.0;
            N.stereoWidenerRLGain = audioContext.createGain();
            N.stereoWidenerRLGain.gain.value = 0;
            N.stereoWidenerLRGain = audioContext.createGain();
            N.stereoWidenerLRGain.gain.value = 0;
            N.stereoWidenerRRGain = audioContext.createGain();
            N.stereoWidenerRRGain.gain.value = 1.0;

            N.deEsserFilter = createBiquadFilter('peaking', 6500, 2.0, 0);

            N.effectsMixGain.connect(N.crossfeedSplitter);
            N.crossfeedSplitter.connect(N.crossfeedMerger, 0, 0);
            N.crossfeedSplitter.connect(N.crossfeedMerger, 1, 1);
            N.crossfeedSplitter.connect(N.crossfeedDelayL, 0);
            N.crossfeedSplitter.connect(N.crossfeedDelayR, 1);
            N.crossfeedDelayL.connect(N.crossfeedFilterL);
            N.crossfeedFilterL.connect(N.crossfeedGainL);
            N.crossfeedGainL.connect(N.crossfeedMerger, 0, 1);
            N.crossfeedDelayR.connect(N.crossfeedFilterR);
            N.crossfeedFilterR.connect(N.crossfeedGainR);
            N.crossfeedGainR.connect(N.crossfeedMerger, 0, 0);
            N.crossfeedMerger.connect(N.stereoWidenerSplitter);
            N.stereoWidenerSplitter.connect(N.stereoWidenerLLGain, 0);
            N.stereoWidenerSplitter.connect(N.stereoWidenerRLGain, 1);
            N.stereoWidenerSplitter.connect(N.stereoWidenerLRGain, 0);
            N.stereoWidenerSplitter.connect(N.stereoWidenerRRGain, 1);
            N.stereoWidenerLLGain.connect(N.stereoWidenerMerger, 0, 0);
            N.stereoWidenerRLGain.connect(N.stereoWidenerMerger, 0, 0);
            N.stereoWidenerLRGain.connect(N.stereoWidenerMerger, 0, 1);
            N.stereoWidenerRRGain.connect(N.stereoWidenerMerger, 0, 1);
            N.stereoWidenerMerger.connect(N.loudnessLow);
            N.loudnessLow.connect(N.loudnessHigh);
            N.loudnessHigh.connect(N.deEsserFilter);
            N.deEsserFilter.connect(N.outputGainNode);

            N.effectsBypassGain.connect(N.outputGainNode);
            N.outputGainNode.connect(N.limiter);

            // === 真峰值限幅器链路：limiter → truePeakOversampler → truePeakCompressor → truePeakCeilingGain → stereoPanner ===
            truePeakOversampler = audioContext.createWaveShaper();
            truePeakCompressor = audioContext.createDynamicsCompressor();
            truePeakCeilingGain = audioContext.createGain();
            // 初始配置：默认启用
            truePeakOversampler.oversample = '4x';
            truePeakOversampler.curve = null; // 由 applyTruePeakConfig 设置
            truePeakCompressor.threshold.value = TRUE_PEAK_LIMITER_DEFAULT.threshold;
            truePeakCompressor.knee.value = 0;
            truePeakCompressor.ratio.value = 20; // 浏览器上限 20，达硬限幅效果
            truePeakCompressor.attack.value = 0.001;
            truePeakCompressor.release.value = TRUE_PEAK_LIMITER_DEFAULT.release;
            truePeakCeilingGain.gain.value = 1.0;
            N.limiter.connect(truePeakOversampler);
            truePeakOversampler.connect(truePeakCompressor);
            truePeakCompressor.connect(truePeakCeilingGain);
            truePeakCeilingGain.connect(N.stereoPanner);
            // 应用初始配置
            applyTruePeakConfig();

            // === Dither 链路：stereoPanner → ditherSplitter → ditherShaperL/R → ditherMerger → destination ===
            ditherSplitter = audioContext.createChannelSplitter(2);
            ditherMerger = audioContext.createChannelMerger(2);
            ditherShaperL = audioContext.createWaveShaper();
            ditherShaperR = audioContext.createWaveShaper();
            ditherNoiseGainL = audioContext.createGain();
            ditherNoiseGainR = audioContext.createGain();
            // 初始化为旁通状态（dither 默认关闭）
            ditherShaperL.curve = null;
            ditherShaperR.curve = null;
            ditherShaperL.oversample = 'none';
            ditherShaperR.oversample = 'none';
            ditherNoiseGainL.gain.value = 0;
            ditherNoiseGainR.gain.value = 0;
            // 创建噪声源（始终运行，通过 gain 控制开关）
            try {
                ditherNoiseSource = audioContext.createBufferSource();
                ditherNoiseSource.buffer = createDitherNoiseBuffer(ditherConfig.targetBits);
                ditherNoiseSource.loop = true;
                ditherNoiseSource.start(0);
                ditherNoiseSource.connect(ditherNoiseGainL);
                ditherNoiseSource.connect(ditherNoiseGainR);
            } catch (e) {
                console.warn('[MoeKoeEQ-MAIN] Dither noise source init failed:', e);
            }
            // 连接 dither 链路
            N.stereoPanner.connect(ditherSplitter);
            ditherSplitter.connect(ditherShaperL, 0);
            ditherSplitter.connect(ditherShaperR, 1);
            ditherNoiseGainL.connect(ditherShaperL);
            ditherNoiseGainR.connect(ditherShaperR);
            ditherShaperL.connect(ditherMerger, 0, 0);
            ditherShaperR.connect(ditherMerger, 0, 1);
            ditherMerger.connect(audioContext.destination);
            // 应用初始 dither 配置
            applyDitherConfig();

            try {
                N.reverbConvolver.buffer = createReverbImpulse();
                N.effectsMixGain.connect(N.reverbConvolver);
                N.reverbConvolver.connect(N.reverbGain);
                N.reverbGain.connect(N.outputGainNode);
            } catch (e) {
                console.warn('[MoeKoeEQ-MAIN] Reverb init failed:', e);
            }

            N.loudnessMaxComp = audioContext.createDynamicsCompressor();
            N.loudnessMaxComp.threshold.value = 0; // 浏览器规定范围 [-100, 0]，0 为最高值（信号 < 0dB 不触发）
            N.loudnessMaxComp.knee.value = 0;      // 硬拐点，无软压缩区域，配合 ratio=1 实现真正旁路
            N.loudnessMaxComp.ratio.value = 1;
            N.loudnessMaxComp.attack.value = 0.005;
            N.loudnessMaxComp.release.value = 0.05;
            N.loudnessMaxMakeupGain = audioContext.createGain();
            N.loudnessMaxMakeupGain.gain.value = 1.0;
            N.outputGainNode.disconnect();
            N.outputGainNode.connect(N.loudnessMaxComp);
            N.loudnessMaxComp.connect(N.loudnessMaxMakeupGain);
            N.loudnessMaxMakeupGain.connect(N.limiter);
        } catch (e) {
            console.error('[MoeKoeEQ-MAIN] Effects init error:', e);
        }
}

    function initAnalyser() {
        if (!audioContext) return;
analyserInput = audioContext.createAnalyser();
        analyserInput.fftSize = 2048;
        analyserInput.smoothingTimeConstant = 0.8;
        spectrumData = new Uint8Array(analyserInput.frequencyBinCount);

        analyserOutput = audioContext.createAnalyser();
        analyserOutput.fftSize = 2048;
        analyserOutput.smoothingTimeConstant = 0.8;
        spectrumOutputData = new Uint8Array(analyserOutput.frequencyBinCount);
    }

    function initDynamicEQNodes() {
        if (!audioContext) {
            console.warn('[MoeKoeEQ-MAIN] initDynamicEQNodes: audioContext not available');
            return;
        }
        dynamicEQAnalyser = audioContext.createAnalyser();
        dynamicEQAnalyser.fftSize = 4096;
        dynamicEQAnalyser.smoothingTimeConstant = 0.6;
        for (var i = 0; i < 31; i++) {
            dynamicEQGainNodes[i] = audioContext.createGain();
            dynamicEQGainNodes[i].gain.value = 1.0;
        }
    }

    function performIFFT(real, imag) {
        var n = real.length;
        for (var i = 1, j = 0; i < n; i++) {
            var bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                var tmp = real[i]; real[i] = real[j]; real[j] = tmp;
                tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
            }
        }
        for (var len = 2; len <= n; len <<= 1) {
            var ang = 2 * Math.PI / len;
            var wR = Math.cos(ang), wI = Math.sin(ang);
            for (var i = 0; i < n; i += len) {
                var cR = 1, cI = 0;
                for (var j = 0; j < (len >> 1); j++) {
                    var uR = real[i + j], uI = imag[i + j];
                    var vR = real[i + j + (len >> 1)] * cR - imag[i + j + (len >> 1)] * cI;
                    var vI = real[i + j + (len >> 1)] * cI + imag[i + j + (len >> 1)] * cR;
                    real[i + j] = uR + vR; imag[i + j] = uI + vI;
                    real[i + j + (len >> 1)] = uR - vR; imag[i + j + (len >> 1)] = uI - vI;
                    var ncR = cR * wR - cI * wI; cI = cR * wI + cI * wR; cR = ncR;
                }
            }
        }
        for (var i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
    }

    function getActiveGainsForLinearPhase() {
        if (midSideEnabled) return midGains;
        if (channelMode === 'independent') return leftGains;
        return currentGains;
    }

    var LINEAR_PHASE_FFT_SIZE = 4096;

    function generateLinearPhaseImpulse(gains) {
        if (!audioContext) return null;
        var fftSize = LINEAR_PHASE_FFT_SIZE;
        var real = new Float32Array(fftSize);
        var imag = new Float32Array(fftSize);
        var sampleRate = audioContext.sampleRate;
        var halfFFT = fftSize / 2;

        for (var i = 0; i <= halfFFT; i++) {
            var freq = (i / fftSize) * sampleRate;
            var gainLinear = 1.0;

            for (var b = 0; b < 31; b++) {
                var centerFreq = EQ_FREQUENCIES[b];
                if (gains[b] === 0) continue;

                var logFreq = Math.log10(Math.max(20, freq));
                var logCenter = Math.log10(centerFreq);
                var logBW = Math.log10(2) / Math.max(0.1, currentQValues[b]);
                var halfLogBW = logBW / 2;

                var dist = (logFreq - logCenter) / halfLogBW;
                if (dist > -3 && dist < 3) {
                    var weight = Math.exp(-dist * dist * 2);
                    gainLinear *= Math.pow(10, gains[b] / 20 * weight);
                }
            }

            real[i] = gainLinear;
            imag[i] = 0;
        }

        for (var i = halfFFT + 1; i < fftSize; i++) {
            real[i] = real[fftSize - i];
            imag[i] = -imag[fftSize - i];
        }

        var realCopy = new Float32Array(real);
        var imagCopy = new Float32Array(imag);
        performIFFT(realCopy, imagCopy);

        var impulse = audioContext.createBuffer(2, fftSize, sampleRate);
        var maxAmp = 0;
        var rmsSum = 0;
        var halfLen = halfFFT;
        var taperLen = Math.min(64, Math.floor(fftSize * 0.01));
        var channelData0 = impulse.getChannelData(0);
        var channelData1 = impulse.getChannelData(1);

        for (var i = 0; i < fftSize; i++) {
            var srcIdx = (i + halfLen) % fftSize;
            var val = realCopy[srcIdx];
            if (i < taperLen) {
                val *= 0.5 * (1 - Math.cos(Math.PI * i / taperLen));
            } else if (i >= fftSize - taperLen) {
                val *= 0.5 * (1 - Math.cos(Math.PI * (fftSize - 1 - i) / taperLen));
            }
            channelData0[i] = val;
            channelData1[i] = val;
            var absVal = Math.abs(val);
            if (absVal > maxAmp) maxAmp = absVal;
            rmsSum += val * val;
        }

        var rms = Math.sqrt(rmsSum / fftSize);
        impulse._moekoePeakAmplitude = maxAmp > 0.001 ? maxAmp : 1.0;
        impulse._moekoeRMS = rms > 0.0001 ? rms : 1.0;

        return impulse;
    }

    var externalSourceNode = null;
    var externalAudioContext = null;
    var externalGainNode = null;
    var interceptInstalled = false;
    var interceptConnectFlag = true;
    var _interceptHasSource = false;
    var _origCreateMES = null;
    var _origConnect = null;
    var _origAudioCtor = null;
    var _origWindowAudio = null;
    var _interceptInstalledOn = null;

    function installCreateMediaElementSourceIntercept() {
        if (interceptInstalled) return;
        interceptInstalled = true;
        console.log('[MoeKoeEQ-MAIN] 安装 createMediaElementSource 拦截器');
var OrigAudioContext = window.AudioContext || window.webkitAudioContext;
        if (!OrigAudioContext) return;

        _origCreateMES = OrigAudioContext.prototype.createMediaElementSource;
        _origAudioCtor = OrigAudioContext;

        OrigAudioContext.prototype.createMediaElementSource = function(audioElement) {
            var sourceNode;
            // 检测 audio 元素是否已被插件接管（fallbackConnect 已调用过 createMediaElementSource）
            var alreadyCaptured = (capturedAudioElement === audioElement && isInitialized);
            try {
                sourceNode = _origCreateMES.call(this, audioElement);
            } catch (e) {
                if (alreadyCaptured) {
                    // audio 已被 EQ 插件接管，主程序（如响度规格化）再次调用会抛 InvalidStateError
                    // 返回哑 GainNode 避免主程序崩溃，并通过 content.js 通知用户
                    console.warn('[MoeKoeEQ-MAIN] createMediaElementSource 失败：audio 已被 EQ 插件接管，返回哑节点');
                    try {
                        window.postMessage({
                            source: MSG_SRC.MAIN,
                            type: 'compatibility-warning',
                            data: {
                                type: 'loudness-normalization-conflict',
                                message: '响度规格化与EQ插件冲突，响度规格化已失效。建议关闭主程序的"响度规格化"选项。'
                            }
                        }, _msgTargetOrigin);
                    } catch (notifyErr) { /* ignore */ }
                    var dummyNode = this.createGain();
                    dummyNode.gain.value = 0;
                    return dummyNode;
                }
                throw e;
            }

            if (audioElement.tagName === 'AUDIO' && !isDestroyed && !pluginDisabled && !_isFallbackConnect) {
                console.log('[MoeKoeEQ-MAIN] createMediaElementSource 拦截触发, audioElement:', audioElement.tagName, 'isDestroyed:', isDestroyed, 'pluginDisabled:', pluginDisabled, '_isFallbackConnect:', _isFallbackConnect);
                if (isInitialized) {
                    if (capturedAudioElement === audioElement) return sourceNode;
                    try { resetAudioState(true); } catch (e) { }
                }
                _interceptHasSource = true;
                externalSourceNode = sourceNode;
                externalAudioContext = this;
                capturedAudioElement = audioElement;
                interceptConnectFlag = true;
setTimeout(function() {
                    if (!isInitialized && externalSourceNode) {
                        connectFromExternalSource();
                    }
                }, 500);
                // 安全超时：如果拦截后 3 秒仍未初始化，重置拦截标志以允许 fallbackConnect
                setTimeout(function() {
                    if (!isInitialized && _interceptHasSource) {
                        console.warn('[MoeKoeEQ-MAIN] createMediaElementSource 拦截后初始化超时，重置拦截标志');
                        _interceptHasSource = false;
                        externalSourceNode = null;
                        externalGainNode = null;
                        interceptConnectFlag = true;
                    }
                }, 3000);
                // 安全超时：如果 2 秒后仍未找到 externalGainNode，尝试直接初始化
                setTimeout(function() {
                    if (!isInitialized && externalSourceNode && !externalGainNode && !isDestroyed) {
                        console.warn('[MoeKoeEQ-MAIN] 未能在超时内捕获 externalGainNode，尝试直接初始化');
                        connectFromExternalSource();
                    }
                }, 2000);
            }

            return sourceNode;
        };

        var origConnect = AudioNode.prototype.connect;
        _origConnect = origConnect;
        _interceptInstalledOn = AudioNode;

        AudioNode.prototype.connect = function(destination) {
            var result = origConnect.apply(this, arguments);

            if (!isDestroyed && !pluginDisabled && interceptConnectFlag && externalSourceNode && this === externalSourceNode && destination && destination.gain !== undefined) {
                console.log('[MoeKoeEQ-MAIN] sourceNode.connect 拦截触发, destination:', destination.constructor.name, 'hasGain:', destination.gain !== undefined);
                externalGainNode = destination;
                interceptConnectFlag = false;
                setTimeout(function() {
                    if (!isInitialized && externalSourceNode && externalGainNode) {
                        insertEQBeforeGain();
                    } else if (isInitialized && externalGainNode && effectsNodes.stereoPanner) {
                        try {
                            effectsNodes.stereoPanner.disconnect();
                            effectsNodes.stereoPanner.connect(ditherSplitter);
                            try { ditherMerger.disconnect(); } catch (e2) {}
                            ditherMerger.connect(externalGainNode);
                        } catch (e) {}
                    }
                }, 100);
            }

            return result;
        };
    }

    async function insertEQBeforeGain() {
        if (isInitialized || !externalSourceNode || !externalGainNode || isDestroyed || isInitializing) return;
        isInitializing = true;
try {
            audioContext = externalAudioContext;

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            createBaseNodes();
            createAllEQNodes();
            initEffectsNodes();
            initAnalyser();
            initDynamicEQNodes();

            sourceNode = externalSourceNode;
            audioElementConnected = true;

            try {
                sourceNode.disconnect();
            } catch (e) { }

            sourceNode.connect(dcFilterNode);
            dcFilterNode.connect(analyserInput);
            analyserInput.connect(eqInputNode);

            rebuildSignalPath();

            eqOutputNode.connect(effectsNodes.effectsBypassGain);
            eqOutputNode.connect(effectsNodes.clarity);
            eqOutputNode.connect(analyserOutput);

            effectsNodes.stereoPanner.disconnect();
            effectsNodes.stereoPanner.connect(ditherSplitter);
            try { ditherMerger.disconnect(); } catch (e2) {}
            ditherMerger.connect(externalGainNode);

            if (dynamicEQConfig.enabled) {
                connectDynamicEQ();
            }

            isInitialized = true;
            isInitializing = false;
            disconnectObserver();

            console.log('[MoeKoeEQ-MAIN] EQ 已通过 insertEQBeforeGain 插入音频链路');

            loadSettingsAndApply();
            notifyStateChangeImmediate();
            watchAudioContextState();
            watchAudioElementSrc();

            if (dynamicEQConfig.enabled) startDynamicEQLoop();
} catch (e) {
            console.error('[MoeKoeEQ-MAIN] insertEQBeforeGain error:', e);
            isInitializing = false;
            notifyError(ERROR_TYPES.INITIALIZATION, 'EQ初始化失败，尝试备用连接', e.message);
            fallbackConnect();
        }
    }

    async function connectFromExternalSource() {
        if (isInitialized || !externalSourceNode || isDestroyed || isInitializing) return;
if (externalGainNode) {
            insertEQBeforeGain();
            return;
        }

        try {
            audioContext = externalAudioContext;

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            createBaseNodes();
            createAllEQNodes();
            initEffectsNodes();
            initAnalyser();
            initDynamicEQNodes();

            sourceNode = externalSourceNode;
            audioElementConnected = true;

            sourceNode.connect(dcFilterNode);
            dcFilterNode.connect(analyserInput);
            analyserInput.connect(eqInputNode);

            rebuildSignalPath();

            eqOutputNode.connect(effectsNodes.effectsBypassGain);
            eqOutputNode.connect(effectsNodes.clarity);
            eqOutputNode.connect(analyserOutput);

            if (externalGainNode) {
                try {
                    effectsNodes.stereoPanner.disconnect();
                    effectsNodes.stereoPanner.connect(ditherSplitter);
                    try { ditherMerger.disconnect(); } catch (e2) {}
                    ditherMerger.connect(externalGainNode);
                } catch (e) {}
            } else {
                // 没有找到外部 gainNode，直接连接到 destination
                try {
                    effectsNodes.stereoPanner.disconnect();
                    effectsNodes.stereoPanner.connect(ditherSplitter);
                    try { ditherMerger.disconnect(); } catch (e2) {}
                    ditherMerger.connect(audioContext.destination);
                    console.warn('[MoeKoeEQ-MAIN] 未找到外部 GainNode，直接连接到 audioContext.destination');
                } catch (e) {}
            }

            if (dynamicEQConfig.enabled) {
                connectDynamicEQ();
            }

            isInitialized = true;
            isInitializing = false;
            disconnectObserver();

            console.log('[MoeKoeEQ-MAIN] EQ 已通过 connectFromExternalSource 初始化');

            loadSettingsAndApply();
            notifyStateChangeImmediate();
            watchAudioContextState();
            watchAudioElementSrc();

            if (dynamicEQConfig.enabled) startDynamicEQLoop();
} catch (e) {
            console.error('[MoeKoeEQ-MAIN] connectFromExternalSource error:', e);
            isInitializing = false;
            fallbackConnect();
        }
    }

    var _isFallbackConnect = false;
    var _selfCreatedAudioContext = false;

    // 在 Shadow DOM 中搜索 audio 元素
    function findAudioInShadowDOM(root) {
        try {
            var allElements = root.querySelectorAll('*');
            for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                if (el.shadowRoot) {
                    var audio = el.shadowRoot.querySelector('audio');
                    if (audio && (audio.src || audio.currentSrc)) return audio;
                    var deeper = findAudioInShadowDOM(el.shadowRoot);
                    if (deeper) return deeper;
                }
            }
        } catch (e) {}
        return null;
    }

    async function fallbackConnect(audioElement) {
        if (isInitialized || isDestroyed || isInitializing) return;
        if (_interceptHasSource) return;
        console.log('[MoeKoeEQ-MAIN] 尝试 fallbackConnect, audioElement:', audioElement ? 'found' : 'not found', '_interceptHasSource:', _interceptHasSource);
        isInitializing = true;
        if (!audioElement) {
            var els = document.querySelectorAll('audio');
            for (var i = 0; i < els.length; i++) {
                if (els[i].src || els[i].currentSrc) { audioElement = els[i]; break; }
            }
        }
        // 搜索 Shadow DOM 中的 audio 元素
        if (!audioElement) {
            audioElement = findAudioInShadowDOM(document);
        }
        if (!audioElement) { console.log('[MoeKoeEQ-MAIN] fallbackConnect: 未找到 audio 元素'); isInitializing = false; return; }
        if (hasFailedAudioElement(audioElement)) { isInitializing = false; return; }

        try {
            if (!audioContext) {
                if (externalAudioContext && externalAudioContext.state !== 'closed') {
                    audioContext = externalAudioContext;
                } else {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    _selfCreatedAudioContext = true;
                }
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(function() {});
            }

            createBaseNodes();
            createAllEQNodes();
            initEffectsNodes();
            initAnalyser();
            initDynamicEQNodes();

            _isFallbackConnect = true;
            try {
                sourceNode = audioContext.createMediaElementSource(audioElement);
                audioElementConnected = true;
            } catch (e) {
                _isFallbackConnect = false;
                markFailedAudioElement(audioElement);
                capturedAudioElement = audioElement;
                isInitializing = false;
                if (_selfCreatedAudioContext && audioContext) {
                    try { audioContext.close(); } catch (ce) {}
                    audioContext = null;
                    _selfCreatedAudioContext = false;
                }
                console.warn('[MoeKoeEQ-MAIN] createMediaElementSource failed, element already connected');
                // 监听 src 变化（切歌），失败标记过期后自动重试
                watchAudioElementSrc();
                return;
            }
            _isFallbackConnect = false;

            sourceNode.connect(dcFilterNode);
            dcFilterNode.connect(analyserInput);
            analyserInput.connect(eqInputNode);

            rebuildSignalPath();

            eqOutputNode.connect(effectsNodes.effectsBypassGain);
            eqOutputNode.connect(effectsNodes.clarity);
            eqOutputNode.connect(analyserOutput);

            if (dynamicEQConfig.enabled) {
                connectDynamicEQ();
            }

            isInitialized = true;
            isInitializing = false;
            disconnectObserver();
            capturedAudioElement = audioElement;

            console.log('[MoeKoeEQ-MAIN] EQ 已通过 fallbackConnect 初始化');

            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(function() {
                    console.warn('[MoeKoeEQ-MAIN] AudioContext resume failed, will retry on user gesture');
                });
            }

            loadSettingsAndApply();
            notifyStateChangeImmediate();
            watchAudioContextState();
            watchAudioElementSrc();

            if (dynamicEQConfig.enabled) startDynamicEQLoop();
} catch (e) {
            console.error('[MoeKoeEQ-MAIN] fallbackConnect error:', e);
            isInitializing = false;
            notifyError(ERROR_TYPES.INITIALIZATION, 'EQ音频连接失败', e.message);
        }
    }

    function connectDynamicEQ() {
        if (!audioContext || !eqOutputNode) return;
try {
            eqOutputNode.connect(dynamicEQAnalyser);
        } catch (e) { /* ignore */ }
    }

    function startDynamicEQLoop() {
        if (dynamicEQFrameId) return;
        if (!dynamicEQAnalyser) {
            if (audioContext && isInitialized) {
                initDynamicEQNodes();
                if (dynamicEQAnalyser) {
                    connectDynamicEQ();
                }
            }
            if (!dynamicEQAnalyser) {
                console.warn('[MoeKoeEQ-MAIN] Dynamic EQ: analyser not created, loop aborted');
                return;
            }
        }
        var freqData = new Float32Array(dynamicEQAnalyser.frequencyBinCount);
        var lastUpdateTime = 0;
        var updateInterval = 1000 / 30;

        function getActiveEQNodes() {
            if (midSideEnabled) return { mid: midEQNodes, side: sideEQNodes };
            if (channelMode === 'independent') return { left: leftEQNodes, right: rightEQNodes };
            return { stereo: eqNodes };
        }

        function loop(timestamp) {
            if (isDestroyed || !dynamicEQConfig.enabled || !dynamicEQAnalyser || !audioContext) {
                dynamicEQFrameId = null;
                return;
            }
            if (audioContext.state === 'closed') {
                dynamicEQFrameId = null;
                return;
            }
            if (audioContext.state === 'suspended') {
                dynamicEQFrameId = null;
                // 尝试恢复 AudioContext，恢复后由 watchAudioContextState 重启 loop
                try { audioContext.resume().catch(function() {}); } catch (e) {}
                return;
            }
            try {
                if (timestamp - lastUpdateTime < updateInterval) {
                    dynamicEQFrameId = requestAnimationFrame(loop);
                    return;
                }

                dynamicEQAnalyser.getFloatFrequencyData(freqData);

                if (!freqData || freqData.length === 0) {
                    dynamicEQFrameId = requestAnimationFrame(loop);
                    return;
                }

                var sampleRate = audioContext.sampleRate;
                var binSize = sampleRate / dynamicEQAnalyser.fftSize;
                var activeNodes = getActiveEQNodes();
                var nodeSets = Object.keys(activeNodes);
                var currentTime = audioContext.currentTime;

                for (var b = 0; b < 31; b++) {
                    var centerBin = Math.round(EQ_FREQUENCIES[b] / binSize);
                    if (centerBin >= freqData.length || centerBin < 0) continue;

                    var levelDB = freqData[centerBin];
                    if (!isFinite(levelDB) || levelDB === -Infinity) continue;

                    var baseGain = currentGains[b];
                    var targetGainDB;

                    if (levelDB > dynamicEQConfig.threshold) {
                        var overDB = levelDB - dynamicEQConfig.threshold;
                        var reductionDB = overDB * (dynamicEQConfig.ratio - 1) / dynamicEQConfig.ratio;
                        targetGainDB = Math.max(-40, baseGain - reductionDB);
                    } else {
                        targetGainDB = baseGain;
                    }

                    for (var s = 0; s < nodeSets.length; s++) {
                        var nodes = activeNodes[nodeSets[s]];
                        if (nodes && nodes[b]) {
                            nodes[b].gain.setTargetAtTime(targetGainDB, currentTime, 0.03);
                        }
                    }
                }

                lastUpdateTime = timestamp;
            } catch (e) {
                console.warn('[MoeKoeEQ-MAIN] Dynamic EQ loop error:', e);
            }
            dynamicEQFrameId = requestAnimationFrame(loop);
        }
        dynamicEQFrameId = requestAnimationFrame(loop);
    }

    function stopDynamicEQLoop() {
if (dynamicEQFrameId) {
            cancelAnimationFrame(dynamicEQFrameId);
            dynamicEQFrameId = null;
        }
        if (isInitialized && audioContext && !linearPhaseEnabled) {
            updateEQNodeGains(eqNodes, currentGains);
            if (channelMode === 'independent') {
                updateEQNodeGains(leftEQNodes, leftGains);
                updateEQNodeGains(rightEQNodes, rightGains);
            }
            if (midSideEnabled) {
                updateEQNodeGains(midEQNodes, midGains);
                updateEQNodeGains(sideEQNodes, sideGains);
            }
        }
    }

    function setEQGain(bandIndex, gainDB) {
        if (bandIndex < 0 || bandIndex >= 31) return;
        var clamped = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gainDB));
        currentGains[bandIndex] = clamped;
        if (!dynamicEQConfig.enabled && audioContext) {
            if (channelMode === 'stereo' && !midSideEnabled) {
                updateEQNodeGains(eqNodes, currentGains);
            }
        }
        if (linearPhaseEnabled && channelMode === 'stereo' && !midSideEnabled) updateLinearPhase();
        notifyStateChange();
    }

    function setEQGains(gains) {
        if (!Array.isArray(gains) || gains.length !== 31) return;
        for (var i = 0; i < 31; i++) {
            currentGains[i] = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gains[i]));
        }
        if (!dynamicEQConfig.enabled && audioContext) {
            if (channelMode === 'stereo' && !midSideEnabled) {
                updateEQNodeGains(eqNodes, currentGains);
            }
        }
        if (linearPhaseEnabled && channelMode === 'stereo' && !midSideEnabled) updateLinearPhase();
        notifyStateChange();
    }

    function setQValue(bandIndex, q) {
        if (bandIndex < 0 || bandIndex >= 31) return;
        currentQValues[bandIndex] = Math.max(Q_VALUE_MIN, Math.min(Q_VALUE_MAX, q));
        if (channelMode === 'independent') {
            leftQValues[bandIndex] = currentQValues[bandIndex];
            rightQValues[bandIndex] = currentQValues[bandIndex];
            updateEQNodeQValues(leftEQNodes, leftQValues);
            updateEQNodeQValues(rightEQNodes, rightQValues);
        } else if (midSideEnabled) {
            updateEQNodeQValues(midEQNodes, currentQValues);
            updateEQNodeQValues(sideEQNodes, currentQValues);
        } else {
            updateEQNodeQValues(eqNodes, currentQValues);
        }
        if (linearPhaseEnabled) updateLinearPhase();
        notifyStateChange();
    }

    function setQValues(qValues) {
        if (!Array.isArray(qValues) || qValues.length !== 31) return;
        for (var i = 0; i < 31; i++) {
            currentQValues[i] = Math.max(Q_VALUE_MIN, Math.min(Q_VALUE_MAX, qValues[i]));
        }
        if (channelMode === 'independent') {
            leftQValues = currentQValues.slice();
            rightQValues = currentQValues.slice();
            updateEQNodeQValues(leftEQNodes, leftQValues);
            updateEQNodeQValues(rightEQNodes, rightQValues);
        } else if (midSideEnabled) {
            updateEQNodeQValues(midEQNodes, currentQValues);
            updateEQNodeQValues(sideEQNodes, currentQValues);
        } else {
            updateEQNodeQValues(eqNodes, currentQValues);
        }
        if (linearPhaseEnabled) updateLinearPhase();
        notifyStateChange();
    }

    function setChannelGains(channel, gains) {
        if (!Array.isArray(gains) || gains.length !== 31) return;
        if (channel === 'left') {
            leftGains = gains.slice();
            updateEQNodeGains(leftEQNodes, leftGains);
        } else if (channel === 'right') {
            rightGains = gains.slice();
            updateEQNodeGains(rightEQNodes, rightGains);
        } else if (channel === 'mid') {
            midGains = gains.slice();
            updateEQNodeGains(midEQNodes, midGains);
        } else if (channel === 'side') {
            sideGains = gains.slice();
            updateEQNodeGains(sideEQNodes, sideGains);
        }
        notifyStateChange();
    }

    function setChannelMode(mode) {
        if (CHANNEL_MODES.indexOf(mode) < 0) return;
channelMode = mode;
        if (isInitialized) {
            rebuildSignalPath();
            tryApplySettings();
        }
        notifyStateChange();
    }

    function toggleMidSide(enabled) {
midSideEnabled = enabled;
        if (isInitialized) {
            rebuildSignalPath();
            tryApplySettings();
        }
        notifyStateChange();
    }

    function toggleLinearPhase(enabled) {
linearPhaseEnabled = enabled;
        if (!isInitialized) return;
        if (enabled) {
            insertLinearPhaseConvolver();
        } else {
            if (linearPhaseConvolver) {
                try { linearPhaseConvolver.disconnect(); } catch (e) { }
                linearPhaseConvolver = null;
            }
            if (linearPhaseConvolverR) {
                try { linearPhaseConvolverR.disconnect(); } catch (e) { }
                linearPhaseConvolverR = null;
            }
            linearPhaseCompensationGain = 1.0;
            rebuildSignalPath();
            if (!dynamicEQConfig.enabled) {
                updateEQNodeGains(eqNodes, currentGains);
                updateEQNodeGains(leftEQNodes, leftGains);
                updateEQNodeGains(rightEQNodes, rightGains);
                updateEQNodeGains(midEQNodes, midGains);
                updateEQNodeGains(sideEQNodes, sideGains);
            }
            if (eqChainGain && audioContext) {
                eqChainGain.gain.setValueAtTime(isEnabled ? 1.0 : 0.0, audioContext.currentTime);
            }
            if (eqBypassGain && audioContext) {
                eqBypassGain.gain.setValueAtTime(isEnabled ? 0.0 : 1.0, audioContext.currentTime);
            }
        }
        notifyStateChange();
    }

    var _linearPhasePending = false;
    var _linearPhaseScheduled = false;

    function updateLinearPhase() {
        if (!audioContext || !linearPhaseEnabled || !linearPhaseConvolver) return;
        _linearPhasePending = true;
        if (_linearPhaseScheduled) return;
        _linearPhaseScheduled = true;
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(_doLinearPhaseUpdate);
        } else {
            setTimeout(_doLinearPhaseUpdate, 16);
        }
    }

    function _doLinearPhaseUpdate() {
        _linearPhaseScheduled = false;
        if (!_linearPhasePending) return;
        _linearPhasePending = false;
        if (!audioContext || !linearPhaseEnabled || !linearPhaseConvolver) return;
        try {
            var activeGains = getActiveGainsForLinearPhase();
            var impulse = generateLinearPhaseImpulse(activeGains);
            if (impulse) {
                linearPhaseConvolver.buffer = impulse;

                if (midSideEnabled) {
                    var sideImpulse = generateLinearPhaseImpulse(sideGains);
                    if (linearPhaseConvolverR) linearPhaseConvolverR.buffer = sideImpulse || impulse;
                } else if (channelMode === 'independent') {
                    var rightImpulse = generateLinearPhaseImpulse(rightGains);
                    if (linearPhaseConvolverR) linearPhaseConvolverR.buffer = rightImpulse || impulse;
                } else {
                    if (linearPhaseConvolverR) linearPhaseConvolverR.buffer = impulse;
                }
                var peakAmp = impulse._moekoePeakAmplitude || 1.0;

                var hasGain = false;
                for (var gi = 0; gi < 31; gi++) {
                    if (Math.abs(currentGains[gi]) > 0.01) {
                        hasGain = true;
                        break;
                    }
                }

                var compensationGain = 1.0;
                if (hasGain && peakAmp > 2.0) {
                    compensationGain = 1.0 / Math.sqrt(peakAmp);
                    compensationGain = Math.max(0.85, compensationGain);
                }
                linearPhaseCompensationGain = compensationGain;
                if (eqChainGain) eqChainGain.gain.setValueAtTime(compensationGain, audioContext.currentTime);
            }
        } catch (e) {
            console.warn('[MoeKoeEQ-MAIN] Linear phase update error:', e);
        }
    }

    function setDynamicEQ(config) {
        var wasEnabled = dynamicEQConfig.enabled;
        dynamicEQConfig = Object.assign({}, DYNAMIC_EQ_DEFAULT, config);
        if (dynamicEQConfig.enabled && !wasEnabled) {
            connectDynamicEQ();
            startDynamicEQLoop();
        } else if (!dynamicEQConfig.enabled && wasEnabled) {
            stopDynamicEQLoop();
            if (linearPhaseEnabled) {
                updateLinearPhase();
            } else {
                updateEQNodeGains(eqNodes, currentGains);
                updateEQNodeGains(leftEQNodes, leftGains);
                updateEQNodeGains(rightEQNodes, rightGains);
                updateEQNodeGains(midEQNodes, midGains);
                updateEQNodeGains(sideEQNodes, sideGains);
            }
        }
        notifyStateChange();
    }

    // === Dither 配置应用 ===
    function applyDitherConfig() {
        if (!audioContext) return;
        var enabled = ditherConfig.enabled !== false;
        var bits = ditherConfig.targetBits || 16;
        var noiseShaping = ditherConfig.noiseShaping !== false;
        if (enabled) {
            // 启用：设置量化曲线 + 噪声增益
            var curve = createDitherCurve(bits, noiseShaping);
            if (ditherShaperL) ditherShaperL.curve = curve;
            if (ditherShaperR) ditherShaperR.curve = curve;
            // 噪声增益 = 1 LSB（TPDF 振幅）
            var lsb = 1 / Math.pow(2, bits - 1);
            if (ditherNoiseGainL) ditherNoiseGainL.gain.value = lsb * 0.5;
            if (ditherNoiseGainR) ditherNoiseGainR.gain.value = lsb * 0.5;
        } else {
            // 禁用：清除曲线（恒等变换）+ 噪声增益归零
            if (ditherShaperL) ditherShaperL.curve = null;
            if (ditherShaperR) ditherShaperR.curve = null;
            if (ditherNoiseGainL) ditherNoiseGainL.gain.value = 0;
            if (ditherNoiseGainR) ditherNoiseGainR.gain.value = 0;
        }
    }

    // === DC 偏移过滤配置应用 ===
    // 启用：highpass frequency = cutoffFreq, Q = Q
    // 禁用：frequency = 1Hz（极低，对音频无影响，等同旁通）
    function applyDCFilterConfig() {
        if (!audioContext || !dcFilterNode) return;
        var enabled = dcFilterConfig.enabled !== false;
        var cutoff = dcFilterConfig.cutoffFreq != null ? dcFilterConfig.cutoffFreq : DC_FILTER_DEFAULT.cutoffFreq;
        var q = dcFilterConfig.Q != null ? dcFilterConfig.Q : DC_FILTER_DEFAULT.Q;
        var t = audioContext.currentTime;
        if (enabled) {
            dcFilterNode.frequency.setValueAtTime(cutoff, t);
            dcFilterNode.Q.setValueAtTime(q, t);
        } else {
            dcFilterNode.frequency.setValueAtTime(1, t);
            dcFilterNode.Q.setValueAtTime(0.707, t);
        }
    }

    // === 真峰值限幅器配置应用 ===
    // 启用：oversampler 加载软限幅曲线 + 压缩器硬限幅 + ceiling gain 调整输出上限
    // 禁用：oversampler 曲线置空（恒等） + 压缩器 ratio=1（旁通） + ceiling gain=1（单位增益）
    function applyTruePeakConfig() {
        if (!audioContext) return;
        var enabled = truePeakLimiterConfig.enabled !== false;
        var threshold = truePeakLimiterConfig.threshold != null ? truePeakLimiterConfig.threshold : TRUE_PEAK_LIMITER_DEFAULT.threshold;
        var ceiling = truePeakLimiterConfig.ceiling != null ? truePeakLimiterConfig.ceiling : TRUE_PEAK_LIMITER_DEFAULT.ceiling;
        var release = truePeakLimiterConfig.release != null ? truePeakLimiterConfig.release : TRUE_PEAK_LIMITER_DEFAULT.release;
        // 安全保护：钳制到合理范围，防止极端值导致近静音或曲线异常
        // threshold/ceiling 必须在 [-12, 0] dB 内，且 threshold <= ceiling
        if (!isFinite(threshold) || threshold < -12) threshold = -12;
        if (threshold > 0) threshold = 0;
        if (!isFinite(ceiling) || ceiling < -12) ceiling = -12;
        if (ceiling > 0) ceiling = 0;
        if (threshold > ceiling) threshold = ceiling;
        if (enabled) {
            // 软限幅曲线：threshold 以下恒等，threshold-ceiling 之间平滑过渡，ceiling 硬上限
            var curve = createTruePeakCurve(threshold, ceiling);
            if (truePeakOversampler) {
                truePeakOversampler.curve = curve;
                truePeakOversampler.oversample = '4x';
            }
            if (truePeakCompressor) {
                truePeakCompressor.threshold.value = threshold;
                truePeakCompressor.knee.value = 0;
                truePeakCompressor.ratio.value = 20; // 浏览器上限 20，硬限幅兜底
                truePeakCompressor.attack.value = 0.001;
                truePeakCompressor.release.value = release;
            }
            // ceiling gain 将信号上限精确控制在 ceiling 线性值
            if (truePeakCeilingGain) {
                truePeakCeilingGain.gain.value = 1.0;
            }
        } else {
            // 禁用：oversampler 恒等 + 压缩器旁通 + 单位增益
            if (truePeakOversampler) {
                truePeakOversampler.curve = null;
                truePeakOversampler.oversample = 'none'; // 禁用时关闭过采样，避免不必要的处理
            }
            if (truePeakCompressor) {
                truePeakCompressor.ratio.value = 1; // 旁通
                truePeakCompressor.threshold.value = 0;
            }
            if (truePeakCeilingGain) {
                truePeakCeilingGain.gain.value = 1.0;
            }
        }
    }

    function setEffect(effectName, value, silent) {
currentEffects[effectName] = value;
        if (!audioContext) return;
        try {
            var t = audioContext.currentTime;
            var N = effectsNodes;
            switch (effectName) {
                case 'clarity': if (N.clarity) N.clarity.gain.setValueAtTime((value / 100) * 12, t); break;
                case 'presence': if (N.presence) N.presence.gain.setValueAtTime((value / 100) * 10, t); break;
                case 'dynamicBass': if (N.dynamicBass) N.dynamicBass.gain.setValueAtTime((value / 100) * 15, t); break;
                case 'bassBoost': if (N.bassBoost) N.bassBoost.gain.setValueAtTime((value / 100) * 12, t); break;
                case 'warmth': if (N.warmth) N.warmth.gain.setValueAtTime((value / 100) * 8, t); break;
                case 'trebleBoost': if (N.trebleBoost) N.trebleBoost.gain.setValueAtTime((value / 100) * 10, t); break;
                case 'vocalEnhance': if (N.vocalEnhance) N.vocalEnhance.gain.setValueAtTime((value / 100) * 8, t); break;
                case 'dynamicEnhance':
                    if (N.dynamicEnhancerInput) N.dynamicEnhancerInput.gain.setValueAtTime(1 + (value / 100) * 0.5, t);
                    if (N.dynamicEnhancer) {
                        if (value <= 0) {
                            N.dynamicEnhancer.ratio.setValueAtTime(1, t);
                            N.dynamicEnhancer.threshold.setValueAtTime(0, t);
                        } else {
                            N.dynamicEnhancer.ratio.setValueAtTime(1 + (value / 100) * 11, t);
                            N.dynamicEnhancer.threshold.setValueAtTime(-20 + (value / 100) * 20, t);
                        }
                    }
                    break;
                case 'ambiance': if (N.ambianceGain) N.ambianceGain.gain.setValueAtTime((value / 100) * 0.8, t); break;
                case 'surround':
                    if (N.surroundGainL) N.surroundGainL.gain.setValueAtTime((value / 100) * 0.85, t);
                    if (N.surroundGainR) N.surroundGainR.gain.setValueAtTime((value / 100) * 0.85, t);
                    break;
                case 'outputGain': if (N.outputGainNode) N.outputGainNode.gain.setValueAtTime(value / 50, t); break;
                case 'stereoBalance': if (N.stereoPanner) N.stereoPanner.pan.setValueAtTime((value - 50) / 50, t); break;
                case 'reverb': if (N.reverbGain) N.reverbGain.gain.setValueAtTime((value / 100) * 0.5, t); break;
                case 'loudnessCompensation': updateLoudnessCompensation(value); break;
                case 'harmonicExciter':
                    if (N.harmonicExciterShaper) N.harmonicExciterShaper.curve = generateHarmonicExciterCurve(value);
                    if (N.harmonicExciterMix) N.harmonicExciterMix.gain.setValueAtTime(value / 100 * 0.5, t);
                    break;
                case 'crossfeed':
                    if (N.crossfeedGainL) N.crossfeedGainL.gain.setValueAtTime(value / 100 * 0.35, t);
                    if (N.crossfeedGainR) N.crossfeedGainR.gain.setValueAtTime(value / 100 * 0.35, t);
                    break;
                case 'subHarmonic':
                    if (N.subHarmonicShaper) N.subHarmonicShaper.curve = generateSubHarmonicCurve(value);
                    if (N.subHarmonicMix) N.subHarmonicMix.gain.setValueAtTime(value / 100 * 0.4, t);
                    break;
                case 'tubeSaturation':
                    if (N.tubeShaper) N.tubeShaper.curve = generateTubeSaturationCurve(value);
                    if (N.tubeMix) N.tubeMix.gain.setValueAtTime(value / 100 * 0.6, t);
                    break;
                case 'multibandComp':
                    var compAmount = value / 100;
                    if (N.multibandLowComp) { N.multibandLowComp.threshold.setValueAtTime(-20 + compAmount * 10, t); N.multibandLowComp.ratio.setValueAtTime(1 + compAmount * 4, t); }
                    if (N.multibandMidComp) { N.multibandMidComp.threshold.setValueAtTime(-20 + compAmount * 10, t); N.multibandMidComp.ratio.setValueAtTime(1 + compAmount * 4, t); }
                    if (N.multibandHighComp) { N.multibandHighComp.threshold.setValueAtTime(-20 + compAmount * 10, t); N.multibandHighComp.ratio.setValueAtTime(1 + compAmount * 4, t); }
                    if (N.multibandLowGain) N.multibandLowGain.gain.setValueAtTime(compAmount * 0.5, t);
                    if (N.multibandMidGain) N.multibandMidGain.gain.setValueAtTime(compAmount * 0.5, t);
                    if (N.multibandHighGain) N.multibandHighGain.gain.setValueAtTime(compAmount * 0.5, t);
                    break;
                case 'deEsser':
                    if (N.deEsserFilter) N.deEsserFilter.gain.setValueAtTime(-(value / 100) * 12, t);
                    break;
                case 'stereoWidener':
                    var width = 1 + (value / 100) * 0.5;
                    var posGain = (1 + width) / 2;
                    var negGain = (1 - width) / 2;
                    if (N.stereoWidenerLLGain) N.stereoWidenerLLGain.gain.setValueAtTime(posGain, t);
                    if (N.stereoWidenerRLGain) N.stereoWidenerRLGain.gain.setValueAtTime(negGain, t);
                    if (N.stereoWidenerLRGain) N.stereoWidenerLRGain.gain.setValueAtTime(negGain, t);
                    if (N.stereoWidenerRRGain) N.stereoWidenerRRGain.gain.setValueAtTime(posGain, t);
                    break;
                case 'tapeEmulation':
                    if (N.tapeShaper) N.tapeShaper.curve = generateTapeCurve(value);
                    if (N.tapeLowShelf) N.tapeLowShelf.gain.setValueAtTime(value / 100 * 3, t);
                    if (N.tapeHighShelf) N.tapeHighShelf.gain.setValueAtTime(-value / 100 * 3, t);
                    if (N.tapeMix) N.tapeMix.gain.setValueAtTime(value / 100 * 0.5, t);
                    break;
                case 'loudnessMaximizer':
                    if (N.loudnessMaxComp) {
                        if (value <= 0) {
                            // value=0 时完全旁路：threshold=0（浏览器上限）+ knee=0（硬拐点）+ ratio=1（不压缩）
                            N.loudnessMaxComp.threshold.setValueAtTime(0, t);
                            N.loudnessMaxComp.ratio.setValueAtTime(1, t);
                        } else {
                            N.loudnessMaxComp.threshold.setValueAtTime(-10 - (value / 100) * 20, t);
                            N.loudnessMaxComp.ratio.setValueAtTime(1 + (value / 100) * 7, t);
                        }
                    }
                    if (N.loudnessMaxMakeupGain) N.loudnessMaxMakeupGain.gain.setValueAtTime(Math.pow(10, (value / 100) * 6 / 20), t);
                    break;
            }
        } catch (e) { /* ignore */ }
        if (!silent) {
            tryApplySettings();
            notifyStateChange();
        }
    }

    function updateLoudnessCompensation(amount) {
        if (!effectsNodes.loudnessLow || !effectsNodes.loudnessHigh || !audioContext) return;
        var t = audioContext.currentTime;
        var factor = amount / 100;
        effectsNodes.loudnessLow.gain.setValueAtTime(factor * 15, t);
        effectsNodes.loudnessHigh.gain.setValueAtTime(factor * 10, t);
    }

    function toggleEffects(enabled) {
effectsEnabled = enabled;
        tryApplySettings();
        notifyStateChange();
    }

    function resetEffects() {
        currentEffects = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
        Object.keys(AUDIO_EFFECTS_DEFAULT).forEach(function(key) {
            setEffect(key, AUDIO_EFFECTS_DEFAULT[key], true);
        });
        notifyStateChange();
    }

    function toggleEQ(enabled) {
        isEnabled = enabled;
        if (eqChainGain && eqBypassGain && audioContext) {
            var t = audioContext.currentTime;
            var chainGain = linearPhaseEnabled ? linearPhaseCompensationGain : 1.0;
            eqChainGain.gain.setValueAtTime(enabled ? chainGain : 0.0, t);
            eqBypassGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, t);

            if (enabled) {
                var hasActiveEffects = effectsEnabled && Object.keys(AUDIO_EFFECTS_DEFAULT).some(function(key) {
                    return currentEffects[key] !== AUDIO_EFFECTS_DEFAULT[key];
                });
                if (hasActiveEffects && effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain) {
                    effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, t);
                    effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, t);
                } else if (effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain) {
                    effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, t);
                    effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, t);
                }
                if (dynamicEQConfig.enabled) startDynamicEQLoop();
            } else {
                if (effectsNodes.effectsBypassGain) effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, t);
                if (effectsNodes.effectsMixGain) effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, t);
                stopDynamicEQLoop();
            }
        }
        notifyStateChange();
    }

    function applyPreset(presetName, presetData) {
        if (typeof presetName !== 'string' || !presetName) return;
var preset = null;
        if (presetName.startsWith('custom_') && presetData) {
            preset = presetData;
        } else if (!presetName.startsWith('custom_')) {
            preset = EQ_PRESETS[presetName];
        }
        if (!preset) return;

        currentPreset = presetName;
        setEQGains(preset.gains);
        if (preset.qValues && Array.isArray(preset.qValues) && preset.qValues.length === 31) {
            setQValues(preset.qValues);
        } else {
            setQValues(Array(31).fill(1.4));
        }

        currentEffects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, preset.effects || {});
        effectsEnabled = true;
        Object.keys(currentEffects).forEach(function(key) {
            setEffect(key, currentEffects[key], true);
        });

        tryApplySettings();
        notifyStateChange();
    }

    function resetEQ() {
        currentPreset = 'flat';
        setEQGains(Array(31).fill(0));
        notifyStateChange();
    }

    function resetPlugin() {
        isEnabled = true;
        pluginDisabled = false;
        currentPreset = 'flat';
        currentGains = Array(31).fill(0);
        currentQValues = Array(31).fill(Q_VALUE_DEFAULT);
        currentEffects = Object.assign({}, AUDIO_EFFECTS_DEFAULT);
        effectsEnabled = true;
        channelMode = 'stereo';
        leftGains = Array(31).fill(0);
        rightGains = Array(31).fill(0);
        midSideEnabled = false;
        midGains = Array(31).fill(0);
        sideGains = Array(31).fill(0);
        linearPhaseEnabled = false;
        dynamicEQConfig = Object.assign({}, DYNAMIC_EQ_DEFAULT);
        referenceProfile = null;
        // 重置新增功能配置
        dcFilterConfig = Object.assign({}, DC_FILTER_DEFAULT);
        ditherConfig = Object.assign({}, DITHER_DEFAULT);
        truePeakLimiterConfig = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT);
        applyDCFilterConfig();
        applyDitherConfig();
        applyTruePeakConfig();

        if (linearPhaseConvolver) {
            try { linearPhaseConvolver.disconnect(); } catch (e) {}
            linearPhaseConvolver = null;
        }
        if (linearPhaseConvolverR) {
            try { linearPhaseConvolverR.disconnect(); } catch (e) {}
            linearPhaseConvolverR = null;
        }
        linearPhaseCompensationGain = 1.0;

        if (isInitialized && audioContext) {
            rebuildSignalPath();
        }

        setEQGains(Array(31).fill(0));
        resetEffects();
        stopDynamicEQLoop();

        if (eqChainGain && eqBypassGain && audioContext) {
            var t = audioContext.currentTime;
            eqChainGain.gain.setValueAtTime(1.0, t);
            eqBypassGain.gain.setValueAtTime(0.0, t);
        }
        notifyStateChange();
    }

    function setPluginDisabled(disabled) {
        pluginDisabled = disabled;
        if (!audioContext) return;
        var t = audioContext.currentTime;
        var chainGain = linearPhaseEnabled ? linearPhaseCompensationGain : 1.0;
        if (disabled) {
            // 彻底旁路：断开 sourceNode 与 EQ 链路，直连 externalGainNode/destination
            // 避免 EQ 链路异常时禁用插件仍无法恢复原生音频
            try {
                if (sourceNode) sourceNode.disconnect();
            } catch (e) { /* ignore */ }
            try {
                if (sourceNode) {
                    if (externalGainNode) {
                        sourceNode.connect(externalGainNode);
                    } else {
                        sourceNode.connect(audioContext.destination);
                    }
                }
            } catch (e) { /* ignore */ }
            if (eqChainGain) eqChainGain.gain.setValueAtTime(0.0, t);
            if (eqBypassGain) eqBypassGain.gain.setValueAtTime(1.0, t);
            if (effectsNodes.effectsBypassGain) effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, t);
            if (effectsNodes.effectsMixGain) effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, t);
            // 禁用时立即静音 Dither 噪声源，避免通过 ditherMerger→destination 链路泄漏
            if (ditherNoiseGainL) ditherNoiseGainL.gain.setValueAtTime(0.0, t);
            if (ditherNoiseGainR) ditherNoiseGainR.gain.setValueAtTime(0.0, t);
            stopDynamicEQLoop();
        } else {
            // 恢复 EQ 链路：sourceNode 重新接入 dcFilter（保留 DC 过滤）
            try {
                if (sourceNode) sourceNode.disconnect();
            } catch (e) { /* ignore */ }
            try {
                if (sourceNode) sourceNode.connect(dcFilterNode);
            } catch (e) { /* ignore */ }
            if (eqChainGain) eqChainGain.gain.setValueAtTime(isEnabled ? chainGain : 0.0, t);
            if (eqBypassGain) eqBypassGain.gain.setValueAtTime(isEnabled ? 0.0 : 1.0, t);
            if (effectsEnabled && effectsNodes.effectsBypassGain) effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, t);
            if (effectsEnabled && effectsNodes.effectsMixGain) effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, t);
            // 恢复 Dither 噪声增益（按当前配置重新应用）
            applyDitherConfig();
            if (dynamicEQConfig.enabled) startDynamicEQLoop();
        }
        notifyStateChange();
    }

    var refCaptureFrameId = null;
    var refCaptureFrames = null;
    var refCaptureCount = 0;
    var REF_CAPTURE_TOTAL = 250;

    function captureReferenceProfile() {
        if (!analyserOutput || !audioContext) return null;
        refCaptureFrames = new Float32Array(analyserOutput.frequencyBinCount);
        refCaptureCount = 0;
        var validFrameCount = 0;
        function captureLoop() {
            if (refCaptureCount >= REF_CAPTURE_TOTAL || !analyserOutput) {
                if (validFrameCount === 0) {
                    refCaptureFrames = null;
                    refCaptureFrameId = null;
                    window.postMessage({ source: MSG_SRC.MAIN, type: 'capture-reference-complete', data: { success: false, error: 'no_valid_audio' } }, _msgTargetOrigin);
                    return;
                }
                var avg = new Float32Array(refCaptureFrames.length);
                for (var i = 0; i < refCaptureFrames.length; i++) {
                    avg[i] = refCaptureFrames[i] / Math.max(1, validFrameCount);
                }
                referenceProfile = {
                    sampleRate: audioContext.sampleRate,
                    fftSize: analyserOutput.fftSize,
                    frequencyData: Array.prototype.slice.call(avg),
                    timestamp: Date.now(),
                    frameCount: validFrameCount
                };
                refCaptureFrames = null;
                refCaptureFrameId = null;
                notifyStateChange();
                window.postMessage({ source: MSG_SRC.MAIN, type: 'capture-reference-complete', data: { success: true } }, _msgTargetOrigin);
                return;
            }
            var data = new Float32Array(analyserOutput.frequencyBinCount);
            analyserOutput.getFloatFrequencyData(data);
            var hasValidData = false;
            for (var i = 0; i < data.length; i++) {
                if (isFinite(data[i]) && data[i] !== -Infinity) {
                    hasValidData = true;
                    break;
                }
            }
            if (hasValidData) {
                for (var i = 0; i < data.length; i++) {
                    if (isFinite(data[i]) && data[i] !== -Infinity) {
                        refCaptureFrames[i] += data[i];
                    }
                }
                validFrameCount++;
            }
            refCaptureCount++;
            refCaptureFrameId = requestAnimationFrame(captureLoop);
        }
        captureLoop();
        return { capturing: true, totalFrames: REF_CAPTURE_TOTAL };
    }

    function matchReferenceProfile() {
        if (!referenceProfile || !analyserOutput || !audioContext) return null;
        if (referenceProfile.sampleRate !== audioContext.sampleRate ||
            referenceProfile.fftSize !== analyserOutput.fftSize) {
            console.warn('[MoeKoeEQ-MAIN] matchReferenceProfile: 采样率或 FFT 大小不匹配', referenceProfile.sampleRate, audioContext.sampleRate);
            window.postMessage({
                source: MSG_SRC.MAIN,
                type: 'match-reference-complete',
                data: { success: false, error: 'sample_rate_mismatch' }
            }, _msgTargetOrigin);
            return null;
        }
        var avgCurrent = new Float32Array(analyserOutput.frequencyBinCount);
        var sampleCount = 30;
        var captured = 0;
        function avgLoop() {
            if (isDestroyed || !analyserOutput || !audioContext) return;
            if (captured >= sampleCount) {
                for (var i = 0; i < avgCurrent.length; i++) avgCurrent[i] /= sampleCount;
                var refData = referenceProfile.frequencyData;
                var binSize = audioContext.sampleRate / analyserOutput.fftSize;
                var matchedGains = Array(31).fill(0);
                for (var b = 0; b < 31; b++) {
                    var centerBin = Math.round(EQ_FREQUENCIES[b] / binSize);
                    var startBin = Math.max(0, centerBin - 2);
                    var endBin = Math.min(avgCurrent.length - 1, refData.length - 1, centerBin + 2);
                    var refAvg = 0, curAvg = 0, count = 0;
                    for (var k = startBin; k <= endBin; k++) {
                        refAvg += refData[k]; curAvg += avgCurrent[k]; count++;
                    }
                    if (count > 0) {
                        refAvg /= count; curAvg /= count;
                        var diff = refAvg - curAvg;
                        matchedGains[b] = Math.max(GAIN_MIN, Math.min(GAIN_MAX, diff * 0.5));
                    }
                }
                setEQGains(matchedGains);
                window.postMessage({ source: MSG_SRC.MAIN, type: 'match-reference-complete', data: { success: true } }, _msgTargetOrigin);
                return;
            }
            var data = new Float32Array(analyserOutput.frequencyBinCount);
            analyserOutput.getFloatFrequencyData(data);
            for (var i = 0; i < data.length; i++) avgCurrent[i] += data[i];
            captured++;
            requestAnimationFrame(avgLoop);
        }
        avgLoop();
        return { matching: true };
    }

    function getSpectrumData() {
        if (!analyserInput || !analyserOutput) return null;
        analyserInput.getByteFrequencyData(spectrumData);
        analyserOutput.getByteFrequencyData(spectrumOutputData);
        return {
            input: Array.prototype.slice.call(spectrumData),
            output: Array.prototype.slice.call(spectrumOutputData),
            sampleRate: audioContext.sampleRate,
            fftSize: analyserInput.fftSize
        };
    }

    function saveSettings() {
        // 不再写入 localStorage，避免与 chrome.storage.local 双存储不同步
        // 状态同步完全由 content.js 通过 chrome.storage.local 完成
        // 此函数保留为空操作，仅作为状态变更后的内存通知触发点
    }

    function loadSettings() {
        // 不再从 localStorage 读取：__moekoe_eq_main_settings 已废弃，
        // 真实设置由 content.js 通过 chrome.storage.local 推送（applySettingsFromStorage）。
        // 启动时使用模块默认值（flat / 无效果），content.js 推送后立即覆盖。
        // 一次性清理陈旧 key，避免旧版本数据残留导致 preset 跳回 bug。
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('__moekoe_eq_main_settings');
            }
        } catch (e) { /* ignore */ }
        requestSettingsFromContent();
    }

    var _storageSettingsApplied = false;

    function loadSettingsAndApply() {
        _storageSettingsApplied = false;
        loadSettings();
        if (isInitialized) tryApplySettings();
    }

    var requestSettingsRetryCount = 0;
    var requestSettingsTimer = null;

    function requestSettingsFromContent() {
        if (requestSettingsTimer) { clearTimeout(requestSettingsTimer); requestSettingsTimer = null; }
        requestSettingsRetryCount = 0;
        setTimeout(sendSettingsRequest, 50);
    }

    function sendSettingsRequest() {
        if (requestSettingsRetryCount >= 5) return;
        requestSettingsRetryCount++;
        window.postMessage({ source: MSG_SRC.MAIN, type: 'request-settings', data: {} }, _msgTargetOrigin);
        if (requestSettingsRetryCount < 5) {
            requestSettingsTimer = setTimeout(sendSettingsRequest, 1000);
        }
    }

    function applySettingsFromStorage(s) {
        if (!s) return;
        console.log('[MoeKoeEQ-MAIN] applySettingsFromStorage, preset:', s.preset, 'effectsEnabled:', s.effectsEnabled);
        _storageSettingsApplied = true;
        isEnabled = s.enabled !== false;
        currentGains = Array.isArray(s.gains) && s.gains.length === 31 ? s.gains : currentGains;
        currentQValues = Array.isArray(s.qValues) && s.qValues.length === 31 ? s.qValues : currentQValues;
        currentPreset = s.preset || currentPreset;
        currentEffects = Object.assign({}, AUDIO_EFFECTS_DEFAULT, s.effects || {});
        effectsEnabled = s.effectsEnabled !== false;
        pluginDisabled = s.pluginDisabled || false;
        channelMode = CHANNEL_MODES.indexOf(s.channelMode) >= 0 ? s.channelMode : channelMode;
        leftGains = Array.isArray(s.leftGains) && s.leftGains.length === 31 ? s.leftGains : leftGains;
        rightGains = Array.isArray(s.rightGains) && s.rightGains.length === 31 ? s.rightGains : rightGains;
        leftQValues = Array.isArray(s.leftQValues) && s.leftQValues.length === 31 ? s.leftQValues : leftQValues;
        rightQValues = Array.isArray(s.rightQValues) && s.rightQValues.length === 31 ? s.rightQValues : rightQValues;
        dynamicEQConfig = Object.assign({}, DYNAMIC_EQ_DEFAULT, s.dynamicEQ || {});
        midSideEnabled = s.midSideEnabled || false;
        midGains = Array.isArray(s.midGains) && s.midGains.length === 31 ? s.midGains : midGains;
        sideGains = Array.isArray(s.sideGains) && s.sideGains.length === 31 ? s.sideGains : sideGains;
        linearPhaseEnabled = s.linearPhaseEnabled || false;
        referenceProfile = s.referenceProfile || null;
        // 新增功能配置（向后兼容合并）
        dcFilterConfig = Object.assign({}, DC_FILTER_DEFAULT, s.dcFilter || {});
        ditherConfig = Object.assign({}, DITHER_DEFAULT, s.dither || {});
        truePeakLimiterConfig = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT, s.truePeakLimiter || {});
        if (isInitialized) tryApplySettings();
    }

    function tryApplySettings() {
        if (!isInitialized || !audioContext) return;
        console.log('[MoeKoeEQ-MAIN] tryApplySettings, isInitialized:', isInitialized, 'audioContext:', audioContext ? audioContext.state : 'null');
var t = audioContext.currentTime;

        if (pluginDisabled) {
            if (eqChainGain) eqChainGain.gain.setValueAtTime(0.0, t);
            if (eqBypassGain) eqBypassGain.gain.setValueAtTime(1.0, t);
            if (effectsNodes.effectsBypassGain) effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, t);
            if (effectsNodes.effectsMixGain) effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, t);
            return;
        }

        if (eqChainGain) eqChainGain.gain.setValueAtTime(isEnabled ? (linearPhaseEnabled ? linearPhaseCompensationGain : 1.0) : 0.0, t);
        if (eqBypassGain) eqBypassGain.gain.setValueAtTime(isEnabled ? 0.0 : 1.0, t);

        if (!dynamicEQConfig.enabled) updateEQNodeGains(eqNodes, currentGains);
        updateEQNodeQValues(eqNodes, currentQValues);
        updateEQNodeGains(leftEQNodes, leftGains);
        updateEQNodeQValues(leftEQNodes, leftQValues);
        updateEQNodeGains(rightEQNodes, rightGains);
        updateEQNodeQValues(rightEQNodes, rightQValues);
        updateEQNodeGains(midEQNodes, midGains);
        updateEQNodeGains(sideEQNodes, sideGains);

        Object.keys(currentEffects).forEach(function(key) {
            var val = currentEffects[key];
            // loudnessMaxComp 在主信号链路中（不在 effects 旁路控制范围内），
            // effectsEnabled=false 时强制旁路，避免预设的 loudnessMaximizer 配置触发压缩产生沙沙声
            if (key === 'loudnessMaximizer' && !effectsEnabled) val = 0;
            setEffect(key, val, true);
        });

        var hasActiveEffects = effectsEnabled && Object.keys(AUDIO_EFFECTS_DEFAULT).some(function(key) {
            return currentEffects[key] !== AUDIO_EFFECTS_DEFAULT[key];
        });

        if (hasActiveEffects && effectsNodes.effectsBypassGain && effectsNodes.effectsMixGain) {
            effectsNodes.effectsBypassGain.gain.setValueAtTime(0.0, t);
            effectsNodes.effectsMixGain.gain.setValueAtTime(1.0, t);
        } else {
            effectsNodes.effectsBypassGain.gain.setValueAtTime(1.0, t);
            effectsNodes.effectsMixGain.gain.setValueAtTime(0.0, t);
        }

        if (linearPhaseEnabled) {
            if (!linearPhaseConvolver) insertLinearPhaseConvolver();
            updateLinearPhase();
        }
        // 应用 Dither 配置
        applyDitherConfig();
        // 应用真峰值限幅器配置
        applyTruePeakConfig();
        // 应用 DC 偏移过滤配置
        applyDCFilterConfig();
        notifyStateChange();
    }

    var notifyDebounceId = null;
    var stateVersion = 0;

    function notifyStateChange() {
        if (notifyDebounceId) return;
        notifyDebounceId = setTimeout(function() {
            notifyDebounceId = null;
            stateVersion++;
            window.postMessage({
                source: MSG_SRC.MAIN, type: 'state-change', data: getState(), version: stateVersion
            }, _msgTargetOrigin);
            saveSettings();
        }, 100);
    }

    function notifyStateChangeImmediate() {
        if (notifyDebounceId) {
            clearTimeout(notifyDebounceId);
            notifyDebounceId = null;
        }
        window.postMessage({
            source: MSG_SRC.MAIN, type: 'state-change', data: getState()
        }, _msgTargetOrigin);
        saveSettings();
    }

    function getState() {
        return {
            enabled: isEnabled, gains: currentGains, qValues: currentQValues,
            preset: currentPreset, mode: isInitialized ? 'main' : 'waiting',
            initialized: isInitialized, effects: currentEffects, effectsEnabled: effectsEnabled,
            pluginDisabled: pluginDisabled, channelMode: channelMode,
            leftGains: leftGains, rightGains: rightGains,
            leftQValues: leftQValues, rightQValues: rightQValues,
            dynamicEQ: dynamicEQConfig, midSideEnabled: midSideEnabled,
            midGains: midGains, sideGains: sideGains,
            linearPhaseEnabled: linearPhaseEnabled,
            dcFilter: dcFilterConfig, dither: ditherConfig,
            truePeakLimiter: truePeakLimiterConfig
        };
    }

    function reconnectAudioElement(newElement) {
        if (!newElement || newElement === capturedAudioElement) return;
        if (hasFailedAudioElement(newElement)) return;

        var oldSourceNode = sourceNode;

        try {
            sourceNode = audioContext.createMediaElementSource(newElement);

            if (oldSourceNode) {
                try { oldSourceNode.disconnect(); } catch (e) { }
            }

            sourceNode.connect(dcFilterNode);
            capturedAudioElement = newElement;
            audioElementConnected = true;

            rebuildSignalPath();

            try { eqOutputNode.disconnect(); } catch(e) {}
            eqOutputNode.connect(effectsNodes.effectsBypassGain);
            eqOutputNode.connect(effectsNodes.clarity);
            eqOutputNode.connect(analyserOutput);

            tryApplySettings();

            if (dynamicEQConfig && dynamicEQConfig.enabled) {
                connectDynamicEQ();
            }
        } catch (e) {
            if (sourceNode !== oldSourceNode) {
                try { sourceNode.disconnect(); } catch (e2) {}
                sourceNode = oldSourceNode;
            }
            markFailedAudioElement(newElement);
            console.warn('[MoeKoeEQ-MAIN] Failed to reconnect, element already connected to another context');
        }
    }

    function disconnectAllNodes() {
        try { if (sourceNode) sourceNode.disconnect(); } catch (e) {}
        try { if (analyserInput) analyserInput.disconnect(); } catch (e) {}
        try { if (analyserOutput) analyserOutput.disconnect(); } catch (e) {}
        try { if (eqInputNode) eqInputNode.disconnect(); } catch (e) {}
        try { if (eqOutputNode) eqOutputNode.disconnect(); } catch (e) {}
        try { if (eqChainGain) eqChainGain.disconnect(); } catch (e) {}
        try { if (eqBypassGain) eqBypassGain.disconnect(); } catch (e) {}
        try { if (channelSplitter) channelSplitter.disconnect(); } catch (e) {}
        try { if (channelMerger) channelMerger.disconnect(); } catch (e) {}
        try { if (leftInputGain) leftInputGain.disconnect(); } catch (e) {}
        try { if (rightInputGain) rightInputGain.disconnect(); } catch (e) {}
        try { if (leftOutputGain) leftOutputGain.disconnect(); } catch (e) {}
        try { if (rightOutputGain) rightOutputGain.disconnect(); } catch (e) {}
        try { if (msEncoderL) msEncoderL.disconnect(); } catch (e) {}
        try { if (msEncoderR) msEncoderR.disconnect(); } catch (e) {}
        try { if (msDecoderMidL) msDecoderMidL.disconnect(); } catch (e) {}
        try { if (msDecoderSideL) msDecoderSideL.disconnect(); } catch (e) {}
        try { if (msDecoderMidR) msDecoderMidR.disconnect(); } catch (e) {}
        try { if (msDecoderSideR) msDecoderSideR.disconnect(); } catch (e) {}
        try { if (msMidSumGain) msMidSumGain.disconnect(); } catch (e) {}
        try { if (msSideDiffGainL) msSideDiffGainL.disconnect(); } catch (e) {}
        try { if (msSideDiffGainR) msSideDiffGainR.disconnect(); } catch (e) {}
        try { if (linearPhaseConvolver) linearPhaseConvolver.disconnect(); } catch (e) {}
        try { if (linearPhaseConvolverR) linearPhaseConvolverR.disconnect(); } catch (e) {}
        try { if (lpSplitter) lpSplitter.disconnect(); } catch (e) {}
        try { if (lpMerger) lpMerger.disconnect(); } catch (e) {}
        for (var i = 0; i < 31; i++) {
            try { if (eqNodes[i]) eqNodes[i].disconnect(); } catch (e) {}
            try { if (leftEQNodes[i]) leftEQNodes[i].disconnect(); } catch (e) {}
            try { if (rightEQNodes[i]) rightEQNodes[i].disconnect(); } catch (e) {}
            try { if (midEQNodes[i]) midEQNodes[i].disconnect(); } catch (e) {}
            try { if (sideEQNodes[i]) sideEQNodes[i].disconnect(); } catch (e) {}
            try { if (dynamicEQGainNodes[i]) dynamicEQGainNodes[i].disconnect(); } catch (e) {}
        }
        try { if (dynamicEQAnalyser) dynamicEQAnalyser.disconnect(); } catch (e) {}
        var N = effectsNodes;
        try { if (N.effectsBypassGain) N.effectsBypassGain.disconnect(); } catch (e) {}
        try { if (N.effectsMixGain) N.effectsMixGain.disconnect(); } catch (e) {}
        try { if (N.clarity) N.clarity.disconnect(); } catch (e) {}
        try { if (N.presence) N.presence.disconnect(); } catch (e) {}
        try { if (N.bassBoost) N.bassBoost.disconnect(); } catch (e) {}
        try { if (N.trebleBoost) N.trebleBoost.disconnect(); } catch (e) {}
        try { if (N.vocalEnhance) N.vocalEnhance.disconnect(); } catch (e) {}
        try { if (N.warmth) N.warmth.disconnect(); } catch (e) {}
        try { if (N.dynamicBass) N.dynamicBass.disconnect(); } catch (e) {}
        try { if (N.dynamicEnhancer) N.dynamicEnhancer.disconnect(); } catch (e) {}
        try { if (N.dynamicEnhancerInput) N.dynamicEnhancerInput.disconnect(); } catch (e) {}
        try { if (N.ambianceDelay) N.ambianceDelay.disconnect(); } catch (e) {}
        try { if (N.ambianceGain) N.ambianceGain.disconnect(); } catch (e) {}
        try { if (N.surroundDelayL) N.surroundDelayL.disconnect(); } catch (e) {}
        try { if (N.surroundDelayR) N.surroundDelayR.disconnect(); } catch (e) {}
        try { if (N.surroundFilterL) N.surroundFilterL.disconnect(); } catch (e) {}
        try { if (N.surroundFilterR) N.surroundFilterR.disconnect(); } catch (e) {}
        try { if (N.surroundGainL) N.surroundGainL.disconnect(); } catch (e) {}
        try { if (N.surroundGainR) N.surroundGainR.disconnect(); } catch (e) {}
        try { if (N.outputGainNode) N.outputGainNode.disconnect(); } catch (e) {}
        try { if (N.stereoPanner) N.stereoPanner.disconnect(); } catch (e) {}
        try { if (N.reverbConvolver) N.reverbConvolver.disconnect(); } catch (e) {}
        try { if (N.reverbGain) N.reverbGain.disconnect(); } catch (e) {}
        try { if (N.loudnessLow) N.loudnessLow.disconnect(); } catch (e) {}
        try { if (N.loudnessHigh) N.loudnessHigh.disconnect(); } catch (e) {}
        try { if (N.limiter) N.limiter.disconnect(); } catch (e) {}
        try { if (N.harmonicExciterHP) N.harmonicExciterHP.disconnect(); } catch (e) {}
        try { if (N.harmonicExciterShaper) N.harmonicExciterShaper.disconnect(); } catch (e) {}
        try { if (N.harmonicExciterMix) N.harmonicExciterMix.disconnect(); } catch (e) {}
        try { if (N.subHarmonicShaper) N.subHarmonicShaper.disconnect(); } catch (e) {}
        try { if (N.subHarmonicLP) N.subHarmonicLP.disconnect(); } catch (e) {}
        try { if (N.subHarmonicMix) N.subHarmonicMix.disconnect(); } catch (e) {}
        try { if (N.tubeShaper) N.tubeShaper.disconnect(); } catch (e) {}
        try { if (N.tubeMix) N.tubeMix.disconnect(); } catch (e) {}
        try { if (N.multibandLowXover) N.multibandLowXover.disconnect(); } catch (e) {}
        try { if (N.multibandMidXover) N.multibandMidXover.disconnect(); } catch (e) {}
        try { if (N.multibandHighXover) N.multibandHighXover.disconnect(); } catch (e) {}
        try { if (N.multibandLowComp) N.multibandLowComp.disconnect(); } catch (e) {}
        try { if (N.multibandMidComp) N.multibandMidComp.disconnect(); } catch (e) {}
        try { if (N.multibandHighComp) N.multibandHighComp.disconnect(); } catch (e) {}
        try { if (N.multibandLowGain) N.multibandLowGain.disconnect(); } catch (e) {}
        try { if (N.multibandMidGain) N.multibandMidGain.disconnect(); } catch (e) {}
        try { if (N.multibandHighGain) N.multibandHighGain.disconnect(); } catch (e) {}
        try { if (N.tapeShaper) N.tapeShaper.disconnect(); } catch (e) {}
        try { if (N.tapeLowShelf) N.tapeLowShelf.disconnect(); } catch (e) {}
        try { if (N.tapeHighShelf) N.tapeHighShelf.disconnect(); } catch (e) {}
        try { if (N.tapeMix) N.tapeMix.disconnect(); } catch (e) {}
        try { if (N.crossfeedSplitter) N.crossfeedSplitter.disconnect(); } catch (e) {}
        try { if (N.crossfeedMerger) N.crossfeedMerger.disconnect(); } catch (e) {}
        try { if (N.crossfeedDelayL) N.crossfeedDelayL.disconnect(); } catch (e) {}
        try { if (N.crossfeedDelayR) N.crossfeedDelayR.disconnect(); } catch (e) {}
        try { if (N.crossfeedFilterL) N.crossfeedFilterL.disconnect(); } catch (e) {}
        try { if (N.crossfeedFilterR) N.crossfeedFilterR.disconnect(); } catch (e) {}
        try { if (N.crossfeedGainL) N.crossfeedGainL.disconnect(); } catch (e) {}
        try { if (N.crossfeedGainR) N.crossfeedGainR.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerSplitter) N.stereoWidenerSplitter.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerMerger) N.stereoWidenerMerger.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerLLGain) N.stereoWidenerLLGain.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerRLGain) N.stereoWidenerRLGain.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerLRGain) N.stereoWidenerLRGain.disconnect(); } catch (e) {}
        try { if (N.stereoWidenerRRGain) N.stereoWidenerRRGain.disconnect(); } catch (e) {}
        try { if (N.deEsserFilter) N.deEsserFilter.disconnect(); } catch (e) {}
        try { if (N.loudnessMaxComp) N.loudnessMaxComp.disconnect(); } catch (e) {}
        try { if (N.loudnessMaxMakeupGain) N.loudnessMaxMakeupGain.disconnect(); } catch (e) {}
        // DC 偏移过滤节点
        try { if (dcFilterNode) dcFilterNode.disconnect(); } catch (e) {}
        // Dither 节点
        try { if (ditherSplitter) ditherSplitter.disconnect(); } catch (e) {}
        try { if (ditherMerger) ditherMerger.disconnect(); } catch (e) {}
        try { if (ditherShaperL) ditherShaperL.disconnect(); } catch (e) {}
        try { if (ditherShaperR) ditherShaperR.disconnect(); } catch (e) {}
        try { if (ditherNoiseGainL) ditherNoiseGainL.disconnect(); } catch (e) {}
        try { if (ditherNoiseGainR) ditherNoiseGainR.disconnect(); } catch (e) {}
        try { if (ditherNoiseSource) ditherNoiseSource.stop(); } catch (e) {}
        try { if (ditherNoiseSource) ditherNoiseSource.disconnect(); } catch (e) {}
        // 真峰值限幅器节点
        try { if (truePeakOversampler) truePeakOversampler.disconnect(); } catch (e) {}
        try { if (truePeakCompressor) truePeakCompressor.disconnect(); } catch (e) {}
        try { if (truePeakCeilingGain) truePeakCeilingGain.disconnect(); } catch (e) {}
    }

    function resetAudioState(clearCaptured) {
        stopDynamicEQLoop();
        disconnectAllNodes();
        isInitialized = false;
        isInitializing = false;
        _interceptHasSource = false;
        audioElementConnected = false;
        if (clearCaptured) capturedAudioElement = null;
        sourceNode = null;
        analyserInput = null;
        analyserOutput = null;
        spectrumData = null;
        spectrumOutputData = null;
        dynamicEQAnalyser = null;
        // DC 偏移过滤节点
        dcFilterNode = null;
        // Dither 节点
        ditherShaperL = null;
        ditherShaperR = null;
        ditherSplitter = null;
        ditherMerger = null;
        ditherNoiseSource = null;
        ditherNoiseGainL = null;
        ditherNoiseGainR = null;
        // 真峰值限幅器节点
        truePeakOversampler = null;
        truePeakCompressor = null;
        truePeakCeilingGain = null;
        eqInputNode = null;
        eqOutputNode = null;
        eqChainGain = null;
        eqBypassGain = null;
        linearPhaseConvolver = null;
        linearPhaseConvolverR = null;
        linearPhaseCompensationGain = 1.0;
        lpSplitter = null;
        lpMerger = null;
        channelSplitter = null;
        channelMerger = null;
        leftInputGain = null;
        rightInputGain = null;
        leftOutputGain = null;
        rightOutputGain = null;
        msMidSumGain = null;
        msSideDiffGainL = null;
        msSideDiffGainR = null;
        for (var i = 0; i < 31; i++) {
            eqNodes[i] = null;
            leftEQNodes[i] = null;
            rightEQNodes[i] = null;
            midEQNodes[i] = null;
            sideEQNodes[i] = null;
            dynamicEQGainNodes[i] = null;
        }
        var keys = Object.keys(effectsNodes);
        for (var k = 0; k < keys.length; k++) {
            effectsNodes[keys[k]] = null;
        }
    }

    function softCleanup() {
        resetAudioState(false);
    }

    function destroy() {
        isDestroyed = true;
        isInitializing = false;
        stopDynamicEQLoop();
        if (refCaptureFrameId) { cancelAnimationFrame(refCaptureFrameId); refCaptureFrameId = null; }
        if (observer) { observer.disconnect(); observer = null; }
        if (_audioSrcObserver) { _audioSrcObserver.disconnect(); _audioSrcObserver = null; }
        if (stateBroadcastInterval) { clearInterval(stateBroadcastInterval); stateBroadcastInterval = null; }
        if (requestSettingsTimer) { clearTimeout(requestSettingsTimer); requestSettingsTimer = null; }
        if (_acStateChangeTimer) { clearTimeout(_acStateChangeTimer); _acStateChangeTimer = null; }
        if (notifyDebounceId) { clearTimeout(notifyDebounceId); notifyDebounceId = null; }
        if (typeof _retryInterval !== 'undefined' && _retryInterval) { clearInterval(_retryInterval); _retryInterval = null; }
        if (typeof clearInitTimers === 'function') clearInitTimers();

        try { document.removeEventListener('loadstart', _onDocLoadStart, true); } catch (e) {}
        try { document.removeEventListener('play', _onDocPlay, true); } catch (e) {}
        try { document.removeEventListener('click', _onDocClickResume, true); } catch (e) {}
        try { document.removeEventListener('keydown', _onDocKeyResume, true); } catch (e) {}
        try { document.removeEventListener('visibilitychange', _onVisibilityChange); } catch (e) {}

        if (_idleGuardTimer) { clearTimeout(_idleGuardTimer); _idleGuardTimer = null; }

        try {
            if (audioContext && _onAcStateChange) {
                audioContext.removeEventListener('statechange', _onAcStateChange);
                _onAcStateChange = null;
            }
        } catch (e) {}

        softCleanup();
        capturedAudioElement = null;

        try {
            if (_origCreateMES && _origAudioCtor) {
                _origAudioCtor.prototype.createMediaElementSource = _origCreateMES;
            }
        } catch (e) {}
        try {
            if (_origConnect && _interceptInstalledOn) {
                _interceptInstalledOn.prototype.connect = _origConnect;
            }
        } catch (e) {}
        try {
            if (_origWindowAudio) {
                window.Audio = _origWindowAudio;
            }
        } catch (e) {}
        _origCreateMES = null;
        _origConnect = null;
        _origAudioCtor = null;
        _origWindowAudio = null;
        _interceptInstalledOn = null;
        interceptInstalled = false;
}

    function findAndConnectAudioElement() {
        if (isInitialized || isDestroyed || isInitializing) return;
        console.log('[MoeKoeEQ-MAIN] findAndConnectAudioElement 调用, isInitialized:', isInitialized, '_interceptHasSource:', _interceptHasSource);
        // 不在这里设置 isInitializing，让 fallbackConnect 自己管理
        try {
            fallbackConnect();
        } catch (e) {
            console.error('[MoeKoeEQ-MAIN] findAndConnectAudioElement error:', e);
            isInitializing = false;
        }
    }

    function disconnectObserver() {
        if (observer) {
            try { observer.disconnect(); } catch (e) {}
            observer = null;
        }
    }

    observer = new MutationObserver(function(mutations) {
        if (isInitialized || isDestroyed || _interceptHasSource) return;
        for (var m = 0; m < mutations.length; m++) {
            if (mutations[m].type === 'attributes' && mutations[m].target && mutations[m].target.tagName === 'AUDIO') {
                var audioEl = mutations[m].target;
                if ((audioEl.src || audioEl.currentSrc) && !hasFailedAudioElement(audioEl)) {
                    setTimeout(function() { fallbackConnect(audioEl); }, 200);
                }
                continue;
            }
            for (var n = 0; n < mutations[m].addedNodes.length; n++) {
                var node = mutations[m].addedNodes[n];
                if (node.tagName === 'AUDIO' && (node.src || node.currentSrc)) {
                    setTimeout(function() { fallbackConnect(node); }, 300);
                } else if (node.querySelectorAll) {
                    var audios = node.querySelectorAll('audio');
                    for (var a = 0; a < audios.length; a++) {
                        if (audios[a].src || audios[a].currentSrc) {
                            (function(audioEl) {
                                setTimeout(function() { fallbackConnect(audioEl); }, 300);
                            })(audios[a]);
                            break;
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

    installCreateMediaElementSourceIntercept();

    var OrigAudio = window.Audio;
    _origWindowAudio = OrigAudio;
    if (OrigAudio) {
        window.Audio = function(src) {
            var audio = new OrigAudio(src);
            try {
                audio.addEventListener('loadstart', function() {
                    if (!isInitialized && !isDestroyed) {
                        setTimeout(function() { fallbackConnect(audio); }, 100);
                    }
                });
                audio.addEventListener('play', function() {
                    if (!isInitialized && !isDestroyed) {
                        setTimeout(function() { fallbackConnect(audio); }, 100);
                    }
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume().catch(function() {});
                    }
                });
            } catch (e) {}
            return audio;
        };
        window.Audio.prototype = OrigAudio.prototype;
        window.Audio.prototype.constructor = window.Audio;
    }

    loadSettings();
    console.log('[MoeKoeEQ-MAIN] 设置已加载, isEnabled:', isEnabled, 'pluginDisabled:', pluginDisabled);

    var _retryCount = 0;
    var _retryMax = 15;
    var _retryInterval = null;
    var _initTimers = [];
    function retryFindAudio() {
        if (isInitialized || isDestroyed || _retryCount >= _retryMax) {
            if (_retryInterval) { clearInterval(_retryInterval); _retryInterval = null; }
            clearInitTimers();
            return;
        }
        _retryCount++;
        console.log('[MoeKoeEQ-MAIN] 重试查找音频元素, 第', _retryCount, '次');
        // 初始化进行中则跳过本次重试，避免重置拦截标志导致竞态
        if (isInitializing) {
            console.log('[MoeKoeEQ-MAIN] 初始化进行中，跳过本次重试');
            return;
        }
        // 如果拦截标志仍为 true 但未初始化，重置标志以允许重试
        if (_interceptHasSource) {
            console.warn('[MoeKoeEQ-MAIN] 重试时重置拦截标志');
            _interceptHasSource = false;
            externalSourceNode = null;
            externalGainNode = null;
            interceptConnectFlag = true;
        }
        findAndConnectAudioElement();
    }
    _retryInterval = setInterval(retryFindAudio, 2000);

    function clearInitTimers() {
        for (var t = 0; t < _initTimers.length; t++) {
            clearTimeout(_initTimers[t]);
        }
        _initTimers = [];
    }

    _initTimers.push(setTimeout(findAndConnectAudioElement, 500));
    _initTimers.push(setTimeout(findAndConnectAudioElement, 1500));
    _initTimers.push(setTimeout(findAndConnectAudioElement, 3000));

    document.addEventListener('loadstart', _onDocLoadStart, true);

    function _onDocLoadStart(e) {
        if (isInitialized || isDestroyed) return;
        if (e.target && e.target.tagName === 'AUDIO') {
            // 如果之前拦截失败，允许重试
            if (_interceptHasSource && !isInitializing) {
                _interceptHasSource = false;
            }
            if (_interceptHasSource) return;
            setTimeout(function() { fallbackConnect(e.target); }, 100);
        }
    }

    document.addEventListener('play', _onDocPlay, true);

    function _onDocPlay(e) {
        if (isInitialized || isDestroyed) return;
        if (e.target && e.target.tagName === 'AUDIO') {
            if (_interceptHasSource && !isInitializing) {
                _interceptHasSource = false;
            }
            if (_interceptHasSource) return;
            setTimeout(function() { fallbackConnect(e.target); }, 100);
        }
    }

    document.addEventListener('click', _onDocClickResume, true);

    function _onDocClickResume() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(function() {
                console.log('[MoeKoeEQ-MAIN] AudioContext resumed by user gesture');
            }).catch(function() {});
        }
        if (isInitialized) document.removeEventListener('click', _onDocClickResume, true);
    }

    document.addEventListener('keydown', _onDocKeyResume, true);

    function _onDocKeyResume() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(function() {});
        }
        if (isInitialized) document.removeEventListener('keydown', _onDocKeyResume, true);
    }

    window.__MOEKOE_AUDIO__ = {
        toggleEQ: toggleEQ, setEQGain: setEQGain, setEQGains: setEQGains,
        setQValue: setQValue, setQValues: setQValues,
        applyPreset: applyPreset, resetEQ: resetEQ, getState: getState,
        getFrequencies: function() { return EQ_FREQUENCIES; },
        getPresets: function() { return EQ_PRESETS; },
        setEffect: setEffect, toggleEffects: toggleEffects, resetEffects: resetEffects,
        setChannelMode: setChannelMode, setChannelGains: setChannelGains,
        toggleMidSide: toggleMidSide, toggleLinearPhase: toggleLinearPhase,
        setDynamicEQ: setDynamicEQ, captureReferenceProfile: captureReferenceProfile,
        matchReferenceProfile: matchReferenceProfile, getSpectrumData: getSpectrumData,
        resetPlugin: resetPlugin, destroy: destroy
    };

    window.addEventListener('message', function(event) {
        if (event.source !== window || isDestroyed) return;
        var data = event.data;
        if (!data || !MSG_SRC || data.source !== MSG_SRC.CONTENT) return;

        switch (data.type) {
            case 'toggle-eq':
if (!pluginDisabled) toggleEQ(data.data.enabled); break;
            case 'set-gain': if (!pluginDisabled) setEQGain(data.data.index, data.data.gain); break;
            case 'set-gains': if (!pluginDisabled) setEQGains(data.data.gains); break;
            case 'set-q-value': if (!pluginDisabled) setQValue(data.data.index, data.data.q); break;
            case 'set-q-values': if (!pluginDisabled) setQValues(data.data.qValues); break;
            case 'apply-preset':
if (!pluginDisabled) applyPreset(data.data.preset, data.data.presetData); break;
            case 'reset-eq': if (!pluginDisabled) resetEQ(); break;
            case 'reset-plugin':
resetPlugin(); break;
            case 'plugin-disabled':
setPluginDisabled(data.data.disabled); break;
            case 'get-state':
                window.postMessage({ source: MSG_SRC.MAIN, type: 'state-response', data: getState() }, _msgTargetOrigin);
                break;
            case 'set-effect': if (!pluginDisabled) setEffect(data.data.effect, data.data.value); break;
            case 'toggle-effects':
if (!pluginDisabled) toggleEffects(data.data.enabled); break;
            case 'reset-effects':
if (!pluginDisabled) resetEffects(); break;
            case 'set-channel-mode':
if (!pluginDisabled) setChannelMode(data.data.channelMode); break;
            case 'set-channel-gains': if (!pluginDisabled) setChannelGains(data.data.channel, data.data.gains); break;
            case 'toggle-mid-side':
if (!pluginDisabled) toggleMidSide(data.data.enabled); break;
            case 'toggle-linear-phase':
if (!pluginDisabled) toggleLinearPhase(data.data.enabled); break;
            case 'set-dynamic-eq':
	if (!pluginDisabled) setDynamicEQ(data.data.dynamicEQ); break;
            case 'set-dither':
                if (!pluginDisabled) {
                    ditherConfig = Object.assign({}, DITHER_DEFAULT, data.data.dither);
                    applyDitherConfig();
                    notifyStateChange();
                }
                break;
            case 'set-true-peak':
                if (!pluginDisabled) {
                    truePeakLimiterConfig = Object.assign({}, TRUE_PEAK_LIMITER_DEFAULT, data.data.truePeakLimiter);
                    applyTruePeakConfig();
                    notifyStateChange();
                }
                break;
            case 'set-dc-filter':
                if (!pluginDisabled) {
                    dcFilterConfig = Object.assign({}, DC_FILTER_DEFAULT, data.data.dcFilter);
                    applyDCFilterConfig();
                    notifyStateChange();
                }
                break;
            case 'capture-reference':
captureReferenceProfile(); break;
            case 'match-reference':
matchReferenceProfile(); break;
            case 'clear-reference':
                referenceProfile = null;
                notifyStateChange();
                break;
            case 'get-spectrum':
                window.postMessage({ source: MSG_SRC.MAIN, type: 'spectrum-response', data: getSpectrumData() }, _msgTargetOrigin);
                break;
            case 'storage-settings':
                if (requestSettingsTimer) { clearTimeout(requestSettingsTimer); requestSettingsTimer = null; }
                requestSettingsRetryCount = 0;
                applySettingsFromStorage(data.data);
                break;
            case 'apply-settings':
                // 分享码导入：应用完整设置对象
                applySettingsFromStorage(data.data);
                if (isInitialized) tryApplySettings();
                notifyStateChange();
                break;
        }
    });

    stateBroadcastInterval = setInterval(function() {
        if (!isDestroyed && isInitialized) {
            window.postMessage({ source: MSG_SRC.MAIN, type: 'state-response', data: getState() }, _msgTargetOrigin);
        }
    }, 3000);

    window.addEventListener('beforeunload', function() {
        saveSettings();
    });

    window.addEventListener('pagehide', function(event) {
        saveSettings();
        if (event.persisted) {
            softCleanup();
        }
    });

    window.addEventListener('pageshow', function(event) {
        if (event.persisted && !isDestroyed && !isInitialized) {
            _interceptHasSource = false;
            setTimeout(function() {
                if (isDestroyed || isInitialized) return;
                if (capturedAudioElement && externalSourceNode && externalAudioContext && externalAudioContext.state !== 'closed') {
                    try {
                        audioContext = externalAudioContext;
                        if (audioContext.state === 'suspended') {
                            audioContext.resume().catch(function() {});
                        }
                        createBaseNodes();
                        createAllEQNodes();
                        initEffectsNodes();
                        initAnalyser();
                        initDynamicEQNodes();
                        sourceNode = externalSourceNode;
                        audioElementConnected = true;
                        sourceNode.connect(dcFilterNode);
                        dcFilterNode.connect(analyserInput);
                        analyserInput.connect(eqInputNode);
                        rebuildSignalPath();
                        eqOutputNode.connect(effectsNodes.effectsBypassGain);
                        eqOutputNode.connect(effectsNodes.clarity);
                        eqOutputNode.connect(analyserOutput);
                        if (externalGainNode) {
                            try {
                                effectsNodes.stereoPanner.disconnect();
                                effectsNodes.stereoPanner.connect(ditherSplitter);
                                try { ditherMerger.disconnect(); } catch (e2) {}
                                ditherMerger.connect(externalGainNode);
                            } catch (e) {}
                        }
                        if (dynamicEQConfig.enabled) {
                            connectDynamicEQ();
                        }
                        isInitialized = true;
                        isInitializing = false;
                        loadSettingsAndApply();
                        notifyStateChangeImmediate();
                        watchAudioContextState();
                        watchAudioElementSrc();
                        if (dynamicEQConfig.enabled) startDynamicEQLoop();
                    } catch (e) {
                        console.warn('[MoeKoeEQ-MAIN] bfcache reconnect failed:', e);
                        findAndConnectAudioElement();
                    }
                } else {
                    findAndConnectAudioElement();
                }
            }, 500);
            setTimeout(function() {
                if (!isInitialized && !isDestroyed) {
                    findAndConnectAudioElement();
                }
            }, 2000);
        }
    });

    document.addEventListener('visibilitychange', _onVisibilityChange);

    function _onVisibilityChange() {
        if (document.hidden && dynamicEQConfig.enabled) {
            stopDynamicEQLoop();
        } else if (!document.hidden && dynamicEQConfig.enabled && isInitialized) {
            // 后台返回前台时，AudioContext 可能处于 suspended 状态，先尝试 resume
            if (audioContext && audioContext.state === 'suspended') {
                try { audioContext.resume().catch(function() {}); } catch (e) {}
            }
            startDynamicEQLoop();
        }
    }

    var _acStateChangeTimer = null;
    var _audioSrcObserver = null;
    var _onAcStateChange = null;
    var _onAudioPlayResume = null;

    function watchAudioElementSrc() {
        if (!capturedAudioElement || _audioSrcObserver) return;
        // 监听 audio 元素的 play 事件，确保 AudioContext 在后台/隐藏后恢复
        if (_onAudioPlayResume) {
            try { capturedAudioElement.removeEventListener('play', _onAudioPlayResume); } catch (e) {}
        }
        _onAudioPlayResume = function() {
            if (isDestroyed || !audioContext) return;
            if (audioContext.state === 'suspended') {
                try {
                    audioContext.resume().catch(function(e) {
                        console.warn('[MoeKoeEQ-MAIN] resume on play failed:', e);
                    });
                } catch (e) { /* ignore */ }
            }
        };
        try { capturedAudioElement.addEventListener('play', _onAudioPlayResume); } catch (e) {}
        try {
            _audioSrcObserver = new MutationObserver(function(mutations) {
                if (isDestroyed) return;
                // 初始化失败后 src 变化（切歌），失败标记过期则重试
                if (!isInitialized) {
                    for (var m = 0; m < mutations.length; m++) {
                        if (mutations[m].type === 'attributes' && mutations[m].attributeName === 'src') {
                            if (capturedAudioElement && !hasFailedAudioElement(capturedAudioElement)) {
                                console.log('[MoeKoeEQ-MAIN] Audio src changed after init failure, retrying fallbackConnect');
                                setTimeout(function() { fallbackConnect(capturedAudioElement); }, 200);
                            }
                            return;
                        }
                    }
                    return;
                }
                for (var m = 0; m < mutations.length; m++) {
                    if (mutations[m].type === 'attributes' && mutations[m].attributeName === 'src') {
                        console.log('[MoeKoeEQ-MAIN] Audio element src changed, re-verifying connection');
                        if (sourceNode && audioContext && audioContext.state === 'running') {
                            tryApplySettings();
                            notifyStateChangeImmediate();
                        }
                    }
                }
            });
            _audioSrcObserver.observe(capturedAudioElement, { attributes: true, attributeFilter: ['src'] });
        } catch (e) {}
    }

    function watchAudioContextState() {
        if (!audioContext) return;
        try {
            // 移除旧监听器，避免重复绑定
            if (_onAcStateChange) {
                try { audioContext.removeEventListener('statechange', _onAcStateChange); } catch (e) {}
            }
            _onAcStateChange = async function() {
                console.log('[MoeKoeEQ-MAIN] AudioContext state changed to:', audioContext.state);

                if (audioContext.state === 'suspended') {
                    console.log('[MoeKoeEQ-MAIN] AudioContext suspended, stopping Dynamic EQ');
                    stopDynamicEQLoop();
                    // 后台/隐藏窗口场景下主动恢复 AudioContext，避免音频流中断
                    if (!isDestroyed && isInitialized && !pluginDisabled) {
                        try {
                            audioContext.resume().then(function() {
                                console.log('[MoeKoeEQ-MAIN] AudioContext resumed from suspended state');
                            }).catch(function(e) {
                                console.warn('[MoeKoeEQ-MAIN] AudioContext resume failed (will retry on play):', e);
                            });
                        } catch (e) { /* ignore */ }
                    }
                }

                if (audioContext.state === 'running' && isInitialized && !isDestroyed) {
                    if (_acStateChangeTimer) clearTimeout(_acStateChangeTimer);
                    _acStateChangeTimer = setTimeout(function() {
                        if (!audioContext || audioContext.state !== 'running' || !isInitialized || isDestroyed) return;

                        console.log('[MoeKoeEQ-MAIN] AudioContext running, restoring audio processing');

                        tryApplySettings();

                        if (dynamicEQConfig.enabled && !dynamicEQFrameId) {
                            console.log('[MoeKoeEQ-MAIN] Restarting Dynamic EQ loop');
                            startDynamicEQLoop();
                        }

                        notifyStateChangeImmediate();
                    }, 200);
                }

                if (audioContext.state === 'closed') {
                    console.warn('[MoeKoeEQ-MAIN] AudioContext closed, cleaning up');
                    stopDynamicEQLoop();
                    softCleanup();
                    isInitialized = false;
                    isInitializing = false;
                }
            };
            audioContext.addEventListener('statechange', _onAcStateChange);
        } catch (e) {
            console.warn('[MoeKoeEQ-MAIN] watchAudioContextState error:', e);
        }
    }

    var _idleGuardTimer = setTimeout(function() {
        if (!isInitialized && !isDestroyed && !pluginDisabled && !capturedAudioElement) {
            if (_retryInterval) { clearInterval(_retryInterval); _retryInterval = null; }
            clearInitTimers();
        }
    }, 15000);
})();
