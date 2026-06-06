# MoeKoe EQ - 31段均衡器音效插件

MoeKoe EQ 是一款为 MoeKoeMusic 音乐播放器设计的 31 段参数均衡器  扩展插件，提供 EQ 调节、音效增强等功能。

> 首先十分感谢「阿珏」及 萌え音 的[MoeKoeMusic](https://github.com/MoeKoeMusic/MoeKoeMusic) 项目。

---

## 核心功能

### 31 段参数均衡器

| 参数 | 规格 |
|------|------|
| 频率范围 | 20Hz - 20kHz，覆盖完整可听频段 |
| 增益范围 | -6dB ~ +6dB，每档 0.5dB |
| Q 值范围 | 0.1 ~ 18.0，默认 1.4，步进 0.1 |
| 频率点 | 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1k, 1.25k, 1.6k, 2k, 2.5k, 3.15k, 4k, 5k, 6.3k, 8k, 10k, 12.5k, 16k, 20k Hz |

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                  Chrome Extension (Manifest V3)                │
├──────────────────────────────────────────────────────────────┤
│  popup.html/js  ←→  background.js (Service Worker)            │
│                          ↓                                    │
│  content.js (Content Script) ←→ inject.js (MAIN World)        │
│          ↓                          ↓                         │
│     Shadow DOM UI            Web Audio API                    │
│                              ├─ BiquadFilter × 31 (EQ 链路)   │
│                              ├─ ConvolverNode × 2 (线性相位)  │
│                              ├─ DynamicsCompressor (限幅器)    │
│                              ├─ AnalyserNode × 2 (频谱分析)   │
│                              ├─ WaveShaperNode (饱和/激励)     │
│                              └─ ChannelSplitter/Merger (M/S)  │
└──────────────────────────────────────────────────────────────┘
```

### 文件职责

| 文件 | 职责 |
|------|------|
| `inject.js` | 音频处理核心：AudioContext 管理、EQ 链路构建、22 项音效处理、动态 EQ、线性相位、M/S 编解码 |
| `content.js` | UI 界面：面板渲染、用户交互、Shadow DOM 隔离、Canvas 频谱绘制、自定义预设管理 |
| `background.js` | 后台服务：设置存储管理、消息路由、预设管理、状态广播 |
| `popup.js` | 弹出窗口：快捷开关、状态显示、预设选择 |
| `shared/constants.js` | 共享常量：频率表、预设数据、效果定义、默认值 |

## 安装与使用

### 安装

1. 将插件目录放入 MoeKoeMusic 的插件目录
2. 重启 MoeKoeMusic（托盘 → MoeKoeMusic → 重启应用）

### 使用

1. 播放音乐后，点击播放栏中插件按钮打开 EQ 面板
2. 选择内置预设或手动调节各频段增益
3. 开启「音效增强」获得更丰富的音频处理
4. 可保存自定义预设供后续使用

---

## 注意事项

- 首次安装需重启 MoeKoeMusic 应用
- 说明一下，这个是用 AI 写的插件，是否使用需自行考量

---

## 预览
<img width="817" height="652" alt="image" src="https://github.com/user-attachments/assets/cebd710d-f152-4a21-a84e-76e23cbd3ec9" />


<img width="1452" height="122" alt="image" src="https://github.com/user-attachments/assets/de66e96f-14f3-4990-9564-675f5a7dafe0" />


                                         旧版本
               
<img width="1283" height="1064" alt="EQ面板" src="https://github.com/user-attachments/assets/60b8e41e-a668-4806-890a-8af9b6f845ae" />

<img width="1283" height="1440" alt="完整界面" src="https://github.com/user-attachments/assets/9235f10e-29db-4aaf-99ed-3d76579150f3" />

<img width="777" height="172" alt="弹出窗口" src="https://github.com/user-attachments/assets/5be9853d-2be6-46ff-b82c-a1c99d741fc8" />
