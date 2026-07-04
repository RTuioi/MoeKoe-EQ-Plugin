var EQ_FREQUENCIES = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
    200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
    2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

var EQ_PRESETS = {
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
    },
    harmanTarget: {
        name: '哈基米曲线',
        gains: [4, 4, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 5],
        effects: { harmonicExciter: 15, tubeSaturation: 10, crossfeed: 20, loudnessMaximizer: 10, clarity: 3, warmth: 2 }
    },
    studioReference: {
        name: '母带处理',
        gains: [2, 2, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 1, 2, 2, 2],
        effects: { multibandComp: 20, harmonicExciter: 12, stereoWidener: 10, loudnessMaximizer: 15, deEsser: 8, clarity: 4, presence: 3 }
    },
    vinylWarmth: {
        name: '黑胶温暖',
        gains: [3, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -2, -3, -3, -4, -4],
        effects: { tubeSaturation: 25, tapeEmulation: 20, harmonicExciter: 10, subHarmonic: 15, warmth: 5, dynamicBass: 3 }
    },
    hiResDetail: {
        name: 'Hi-Res解析',
        gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 3, 3],
        effects: { harmonicExciter: 20, stereoWidener: 15, deEsser: 10, clarity: 5, presence: 3, loudnessMaximizer: 8 }
    },
    liveConcert: {
        name: '演唱会近场',
        gains: [2.5, 2.5, 2, 2, 1.5, 1, 0.5, 0, -0.5, -0.5, -1, -0.5, 0, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 3.5, 3, 2.5, 2, 2, 1.5, 1.5, 1, 1],
        effects: { ambiance: 35, surround: 30, reverb: 15, dynamicEnhance: 25, vocalEnhance: 30, presence: 25, clarity: 20, crossfeed: 25, dynamicBass: 20, warmth: 15, stereoWidener: 15, loudnessCompensation: 10 }
    },
    immersivePanorama: {
        name: '沉浸全景',
        gains: [3, 3, 2.5, 2, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1, -0.5, 0, 0, 0.5, 1, 1.5, 1.5, 1, 0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3, 2.5, 2.5, 2],
        effects: { bassBoost: 20, dynamicBass: 25, warmth: 20, vocalEnhance: 25, presence: 20, clarity: 25, trebleBoost: 15, dynamicEnhance: 20, ambiance: 25, surround: 30, reverb: 10, harmonicExciter: 20, crossfeed: 20, subHarmonic: 15, tubeSaturation: 15, multibandComp: 15, deEsser: 10, stereoWidener: 20, tapeEmulation: 8, loudnessMaximizer: 15, loudnessCompensation: 10, outputGain: 52 }
    },
    masterMonitor: {
        name: '大师监听',
        gains: [3, 3, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0, 0, 0.5, 0.5, 0.5, 1, 1.5, 2, 2.5, 2, 2.5, 3, 3.5, 4, 4.5, 4.5],
        effects: { multibandComp: 25, harmonicExciter: 15, stereoWidener: 12, deEsser: 12, loudnessMaximizer: 20, clarity: 15, presence: 10, crossfeed: 15, dynamicEnhance: 12, loudnessCompensation: 8, outputGain: 51 }
    },
    edm: {
        name: '电子舞曲',
        gains: [5, 5, 4, 4, 3, 2, 0, -1, -2, -2, -1, 0, -1, -2, -2, -1, 0, 0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 4, 5, 5, 4],
        effects: { dynamicBass: 35, dynamicEnhance: 25, surround: 20, harmonicExciter: 18, subHarmonic: 30, stereoWidener: 20, loudnessMaximizer: 15, bassBoost: 20, clarity: 10, outputGain: 54 }
    },
    hiphop: {
        name: '嘻哈说唱',
        gains: [5, 5, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1],
        effects: { bassBoost: 40, dynamicBass: 35, vocalEnhance: 20, dynamicEnhance: 20, warmth: 15, subHarmonic: 25, multibandComp: 15, loudnessMaximizer: 12, outputGain: 55 }
    },
    acousticFolk: {
        name: '民谣原声',
        gains: [-1, -1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, -1, -1, -1, -2, -2, -2, -2],
        effects: { warmth: 22, vocalEnhance: 18, crossfeed: 12, deEsser: 10, outputGain: 50 }
    },
    podcast: {
        name: '播客有声书',
        gains: [-5, -5, -4, -4, -3, -2, -1, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, -1, -1, -2, -2, -2, -2, -2, -2, -2],
        effects: { vocalEnhance: 30, deEsser: 25, outputGain: 51 }
    },
    cinema: {
        name: '影院模式',
        gains: [4, 5, 5, 4, 3, 2, 1, 0, -1, -1, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2],
        effects: { surround: 40, ambiance: 35, dynamicBass: 30, vocalEnhance: 18, subHarmonic: 25, crossfeed: 20, reverb: 10, loudnessCompensation: 20, stereoWidener: 18, bassBoost: 15, outputGain: 53 }
    },
    lofiChill: {
        name: 'Lo-Fi休闲',
        gains: [2, 2, 3, 3, 3, 2, 2, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, -1, -1, -2, -2, -3, -3, -3, -4, -4, -4, -5, -5, -5, -5],
        effects: { tapeEmulation: 40, tubeSaturation: 25, warmth: 20, ambiance: 15, reverb: 12, crossfeed: 20, stereoWidener: 12, loudnessCompensation: 10, outputGain: 50 }
    },
    metal: {
        name: '金属硬核',
        gains: [3, 3, 2, 1, 0, -1, -2, -3, -3, -2, -1, 0, 1, 2, 3, 4, 5, 5, 4, 3, 3, 4, 5, 5, 4, 3, 3, 4, 4, 3, 2],
        effects: { clarity: 30, presence: 25, trebleBoost: 20, dynamicEnhance: 25, multibandComp: 30, deEsser: 12, harmonicExciter: 18, loudnessMaximizer: 18, outputGain: 54 }
    },
    asmrSleep: {
        name: 'ASMR助眠',
        gains: [2, 2, 2, 3, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, -1, -1, -2, -2, -3, -3, -3, -3, -4, -4, -4, -4, -4, -4, -4],
        effects: { warmth: 20, crossfeed: 35, loudnessCompensation: 30, tapeEmulation: 18, ambiance: 8, stereoWidener: 8, outputGain: 46 }
    },
    workout: {
        name: '运动',
        gains: [5, 5, 5, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 3, 3, 3, 4, 4, 4, 3, 3, 2, 2, 3, 4, 4, 3],
        effects: { bassBoost: 35, dynamicBass: 30, dynamicEnhance: 40, loudnessMaximizer: 30, trebleBoost: 18, surround: 15, harmonicExciter: 15, multibandComp: 12, stereoWidener: 10, outputGain: 58 }
    },
    pianoClassical: {
        name: '古典钢琴',
        gains: [-1, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 2, 2, 1, 0, 0, -1, -2, -2, -2],
        effects: { clarity: 20, presence: 15, deEsser: 18, ambiance: 12, reverb: 8, crossfeed: 12, loudnessCompensation: 8, outputGain: 50 }
    },
    deepBass: {
        name: '澎湃重低音',
        gains: [2, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        effects: { dynamicBass: 30, bassBoost: 20, subHarmonic: 15, clarity: 8, multibandComp: 12, loudnessCompensation: 10, outputGain: 51 }
    },
    transparentFull: {
        name: '通透饱满',
        gains: [2, 3, 3, 4, 4, 5, 4, 3, 1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 4, 4, 4, 4, 4, 3, 3, 2, 1, 1, 1, 1],
        effects: { clarity: 25, presence: 20, dynamicBass: 22, warmth: 12, surround: 18, stereoWidener: 15, dynamicEnhance: 15, harmonicExciter: 12, crossfeed: 8, multibandComp: 8, loudnessCompensation: 5, outputGain: 52 }
    },
    mainstreamPop: {
        name: '华语流行',
        gains: [1, 2, 2, 3, 4, 4, 4, 3, 1, 0, 0, 0, 0, 0, 0, 1, 3, 4, 4, 3, 2, 1, 0, 1, 2, 2, 1, 0, 0, 0, 0],
        effects: { vocalEnhance: 28, presence: 18, clarity: 15, dynamicBass: 18, warmth: 12, surround: 12, stereoWidener: 12, harmonicExciter: 10, dynamicEnhance: 12, outputGain: 52 }
    },
    westernPop: {
        name: '欧美流行',
        gains: [3, 4, 4, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0],
        effects: { dynamicBass: 25, bassBoost: 15, clarity: 18, presence: 15, surround: 15, stereoWidener: 18, dynamicEnhance: 18, harmonicExciter: 15, vocalEnhance: 15, multibandComp: 8, outputGain: 53 }
    },
    rnbSoul: {
        name: 'R&B律动',
        gains: [3, 3, 4, 4, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, -1, -1, -1, -1, -1],
        effects: { dynamicBass: 28, warmth: 18, vocalEnhance: 25, surround: 15, stereoWidener: 15, crossfeed: 12, harmonicExciter: 10, dynamicEnhance: 12, outputGain: 52 }
    },
    vastSoundstage: {
        name: '声场',
        gains: [1, 1, 1, 2, 2, 2, 1, 1, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 3, 2, 2, 1],
        effects: { surround: 55, stereoWidener: 40, ambiance: 35, reverb: 20, crossfeed: 15, harmonicExciter: 15, clarity: 15, dynamicBass: 12, warmth: 5, outputGain: 51 }
    },
    sweetVocal: {
        name: '派大星',
        gains: [-5, -5, -4, -4, -3, -2, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -2, -2, -2, -3, -3, -3],
        effects: { warmth: 40, vocalEnhance: 60, presence: 60, clarity: 80, harmonicExciter: 70, deEsser: 50, loudnessMaximizer: 50, loudnessCompensation: 60, outputGain: 55 }
    }
};

var AUDIO_EFFECTS_DEFAULT = {
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
    stereoBalance: 50,
    loudnessCompensation: 0,
    harmonicExciter: 0,
    crossfeed: 0,
    subHarmonic: 0,
    tubeSaturation: 0,
    multibandComp: 0,
    deEsser: 0,
    stereoWidener: 0,
    tapeEmulation: 0,
    loudnessMaximizer: 0
};

var DYNAMIC_EQ_DEFAULT = {
    enabled: false,
    threshold: -30,
    ratio: 6,
    attack: 0.02,
    release: 0.15
};

var LIMITER_DEFAULT = {
    threshold: -3,
    knee: 10,
    ratio: 8,
    attack: 0.005,
    release: 0.5
};

// DC 偏移过滤（始终启用，开销极小）
var DC_FILTER_DEFAULT = {
    enabled: true,
    cutoffFreq: 20,
    Q: 0.707
};

// 真峰值限幅器（4× 过采样）
var TRUE_PEAK_LIMITER_DEFAULT = {
    enabled: true,
    threshold: -1.0,    // dBFS，目标真峰值
    ceiling: -0.5,      // dBFS，输出上限
    release: 0.1,      // s
    oversample: 4       // 2 或 4
};

// 位深抖动
var DITHER_DEFAULT = {
    enabled: false,
    targetBits: 16,    // 16 or 24
    noiseShaping: true
};

// 真正的多段压缩（4 段 LR4 交叉）
var MULTIBAND_COMPRESSOR_PRO_DEFAULT = {
    enabled: false,
    bands: [
        { freqMax: 150,   threshold: -20, ratio: 3, attack: 0.010, release: 0.150, makeup: 1.0, knee: 6 },
        { freqMax: 1500,  threshold: -20, ratio: 3, attack: 0.005, release: 0.100, makeup: 1.0, knee: 6 },
        { freqMax: 6000,  threshold: -20, ratio: 3, attack: 0.003, release: 0.080, makeup: 1.0, knee: 6 },
        { freqMax: 24000, threshold: -20, ratio: 3, attack: 0.001, release: 0.050, makeup: 1.0, knee: 6 }
    ]
};

// 自动 EQ 增强
var AUTO_EQ_DEFAULT = {
    targetCurve: 'custom',  // 'harman', 'diffuse', 'flat', 'custom'
    smoothing: 3,            // 1-7 平滑窗口
    perceptualWeighting: true,
    loudnessNormalize: true,
    maxGainDB: 6,            // 单段最大增益
    matchIterations: 1       // 1-3 次迭代
};

// 分享码
var SHARE_CODE_VERSION = '2.0';
var SHARE_CODE_PREFIX = 'MEQ:';

var DEFAULT_SETTINGS = {
    enabled: true,
    gains: Array(31).fill(0),
    qValues: Array(31).fill(1.4),
    preset: 'flat',
    pluginDisabled: false,
    effects: null,
    effectsEnabled: true,
    channelMode: 'stereo',
    leftGains: Array(31).fill(0),
    rightGains: Array(31).fill(0),
    leftQValues: Array(31).fill(1.4),
    rightQValues: Array(31).fill(1.4),
    dynamicEQ: null,
    midSideEnabled: false,
    midGains: Array(31).fill(0),
    sideGains: Array(31).fill(0),
    linearPhaseEnabled: false,
    referenceProfile: null,
    dcFilter: null,
    dither: null,
    truePeakLimiter: null
};

var MSG_SRC = {
    CONTENT: '__moekoe_eq_content__',
    MAIN: '__moekoe_eq_main__',
    BACKGROUND: '__moekoe_eq_background__',
    POPUP: '__moekoe_eq_popup__'
};

var STORAGE_KEYS = {
    SETTINGS: 'eqSettings',
    CUSTOM_PRESETS: 'eqCustomPresets'
};

var Q_VALUE_MIN = 0.1;
var Q_VALUE_MAX = 18.0;
var Q_VALUE_DEFAULT = 1.4;
var Q_VALUE_STEP = 0.1;

var GAIN_MIN = -6;
var GAIN_MAX = 6;
var GAIN_STEP = 0.5;

var CHANNEL_MODES = ['stereo', 'left', 'right', 'independent'];

var LOUDNESS_BOOST_TABLE = [
    { freq: 20, lowBoost: 14, midBoost: 0, highBoost: 8 },
    { freq: 50, lowBoost: 10, midBoost: 0, highBoost: 6 },
    { freq: 100, lowBoost: 6, midBoost: 0, highBoost: 4 },
    { freq: 200, lowBoost: 3, midBoost: 0, highBoost: 2 },
    { freq: 500, lowBoost: 1, midBoost: 0, highBoost: 1 },
    { freq: 1000, lowBoost: 0, midBoost: 0, highBoost: 0 },
    { freq: 2000, lowBoost: 0, midBoost: 0, highBoost: 1 },
    { freq: 4000, lowBoost: 0, midBoost: 0, highBoost: 3 },
    { freq: 8000, lowBoost: 0, midBoost: 0, highBoost: 5 },
    { freq: 12000, lowBoost: 0, midBoost: 0, highBoost: 6 },
    { freq: 20000, lowBoost: 0, midBoost: 0, highBoost: 8 }
];

var REVERB_SEED_VALUES = [
    0.327, 0.512, 0.891, 0.234, 0.678, 0.456, 0.123, 0.789,
    0.345, 0.567, 0.890, 0.012, 0.456, 0.678, 0.901, 0.234,
    0.567, 0.890, 0.123, 0.456, 0.789, 0.012, 0.345, 0.678,
    0.901, 0.234, 0.567, 0.890, 0.123, 0.456, 0.789, 0.012
];

var EFFECTS_CATEGORIES = {
    basic: {
        name: '基础增强',
        effects: ['bassBoost', 'dynamicBass', 'warmth', 'vocalEnhance', 'presence', 'clarity', 'trebleBoost']
    },
    spatial: {
        name: '空间效果',
        effects: ['dynamicEnhance', 'ambiance', 'surround', 'reverb', 'stereoWidener', 'crossfeed']
    },
    professional: {
        name: '专业处理',
        effects: ['harmonicExciter', 'tubeSaturation', 'subHarmonic', 'tapeEmulation', 'deEsser', 'multibandComp']
    },
    master: {
        name: '母带处理',
        effects: ['loudnessMaximizer', 'loudnessCompensation', 'outputGain', 'stereoBalance']
    }
};

var EFFECTS_INFO = {
    bassBoost: { name: '低音增强', max: 100, desc: '增强60Hz附近的低频，让低音更有力' },
    dynamicBass: { name: '动态低音', max: 100, desc: '低频动态增强，低音更有弹性' },
    warmth: { name: '温暖感', max: 100, desc: '增强250Hz中低频，声音更温暖厚实' },
    vocalEnhance: { name: '人声增强', max: 100, desc: '增强3kHz中高频，让人声更突出' },
    presence: { name: '临场感', max: 100, desc: '增强4kHz频段，提升声音临场感' },
    clarity: { name: '清晰度', max: 100, desc: '增强8kHz以上高频，声音更清晰透亮' },
    trebleBoost: { name: '高音增强', max: 100, desc: '增强6kHz以上高频，高音更明亮' },
    dynamicEnhance: { name: '动态压缩', max: 100, desc: '压缩动态范围，安静部分更响亮' },
    ambiance: { name: '氛围感', max: 100, desc: '添加短延迟反射，增加空间氛围感' },
    surround: { name: '环绕声', max: 100, desc: '添加声道间延迟差，模拟环绕声效果' },
    reverb: { name: '混响', max: 100, desc: '添加混响效果，模拟大厅或房间回声' },
    harmonicExciter: { name: '谐波激励', max: 100, desc: '添加高频谐波，声音更明亮有细节' },
    crossfeed: { name: '交叉馈送', max: 100, desc: '模拟音箱听感，减少耳机疲劳感' },
    subHarmonic: { name: '低频谐波', max: 100, desc: '生成低频次谐波，增强超低频感受' },
    tubeSaturation: { name: '电子管饱和', max: 100, desc: '模拟电子管温暖失真，声音更饱满' },
    multibandComp: { name: '多段压缩', max: 100, desc: '分频段独立压缩，各频段更均衡' },
    deEsser: { name: '去齿音', max: 100, desc: '衰减6.5kHz齿音频段，减少刺耳感' },
    stereoWidener: { name: '立体声展宽', max: 100, desc: '扩展立体声宽度，声场更开阔' },
    tapeEmulation: { name: '磁带仿真', max: 100, desc: '模拟磁带录音特性，声音更温暖柔和' },
    loudnessMaximizer: { name: '响度最大化', max: 100, desc: '提升整体响度，声音更饱满有力' },
    loudnessCompensation: { name: '响度补偿', max: 100, desc: '补偿低音量下高低频损失，小音量也好听' },
    outputGain: { name: '输出增益', max: 100, desc: '调节输出音量大小' },
    stereoBalance: { name: '声道平衡', max: 100, desc: '调节左右声道平衡，50为居中' }
};

// 常量版本标记：修改本文件时务必同步更新 background.js / content.js / inject.js 的 fallback
var MOEKOE_CONSTANTS_VERSION = '2.0.3';
if (typeof window !== 'undefined') window.__MOEKOE_CONSTANTS_VERSION__ = MOEKOE_CONSTANTS_VERSION;
