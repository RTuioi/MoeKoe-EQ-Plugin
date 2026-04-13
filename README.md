# MoeKoe EQ - 31段均衡器音效插件

MoeKoe EQ 是一款专为 MoeKoeMusic 音乐播放器设计的 31 段参数均衡器 Chrome 扩展插件，提供专 EQ 调节、音效增强、动态 EQ、线性相位处理等功能。

> 首先十分感谢「阿珏」开发的 [MoeKoeMusic](https://github.com/MoeKoeMusic/MoeKoeMusic) 项目。

---

## 核心功能

### 31 段参数均衡器

| 参数 | 规格 |
|------|------|
| 频率范围 | 20Hz - 20kHz，覆盖完整可听频段 |
| 增益范围 | -6dB ~ +6dB，每档 0.5dB |
| Q 值范围 | 0.1 ~ 18.0，默认 1.4，步进 0.1 |
| 频率点 | 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1k, 1.25k, 1.6k, 2k, 2.5k, 3.15k, 4k, 5k, 6.3k, 8k, 10k, 12.5k, 16k, 20k Hz |

### 内置预设

| 预设名称 | 适用场景 | 含音效 |
|----------|---------|--------|
| 平坦 | 默认无修饰 | - |
| 摇滚 | 摇滚音乐 | - |
| 古典 | 古典音乐 | - |
| 流行 | 流行音乐 | - |
| 爵士 | 爵士乐 | - |
| 低音增强 | 重低音爱好者 | - |
| 高音增强 | 清晰高音 | - |
| 人声 | 人声突出 | - |
| 仿：风雪调音 | 特色调音 | ✓ |
| 极致听感 | 综合增强 | ✓ |
| 醇美空间 | 空间感增强 | ✓ |
| 殿堂·哈基米曲线 | 哈基米曲线 | ✓ |
| 殿堂·母带处理 | 母带处理 | ✓ |
| 殿堂·黑胶温暖 | 黑胶温暖质感 | ✓ |
| 殿堂·Hi-Res解析 | 高解析度增强 | ✓ |

### 音效增强（22 项参数）

| 分类 | 效果 |
|------|------|
| 基础增强 | 低音增强、动态低音、温暖感、人声增强、临场感、清晰度、高音增强 |
| 空间效果 | 动态压缩、氛围感、环绕声、混响、立体声展宽、交叉馈送 |
| 专业处理 | 谐波激励、电子管饱和、低频谐波、磁带仿真、去齿音、多段压缩 |
| 母带处理 | 响度最大化、响度补偿、输出增益、声道平衡 |

### 高级功能

- **线性相位 EQ**：使用 ConvolverNode 实现 FIR 滤波，双声道独立处理，避免相位失真
- **动态 EQ**：实时频谱分析，根据信号强度自动调节各频段增益
- **M/S 编码处理**：独立调节 Mid（中间）和 Side（侧面）声道，精细控制声场
- **声道模式**：立体声 / 左声道 / 右声道 / 独立 L/R 四种模式
- **参考曲目匹配**：采集参考曲目频谱特征，自动匹配 EQ 曲线
- **响度补偿**：基于等响曲线，补偿低音量下高低频感知损失
- **限幅器**：防止削波失真，保护听觉设备

---

## 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                    Chrome Extension (MV3)                  │
├──────────────────────────────────────────────────────────┤
│  popup.html/js  ←→  background.js (Service Worker)        │
│                          ↓                                │
│  content.js (Content Script) ←→ inject.js (MAIN World)    │
│          ↓                          ↓                     │
│     Shadow DOM UI            Web Audio API                │
│                              (BiquadFilter × 31)          │
│                              (ConvolverNode × 2)          │
│                              (DynamicsCompressor)         │
│                              (AnalyserNode × 2)           │
└──────────────────────────────────────────────────────────┘
```

### 文件职责

| 文件 | 职责 |
|------|------|
| `inject.js` | 音频处理核心：AudioContext 管理、EQ 链路构建、音效处理、动态 EQ |
| `content.js` | UI 界面：面板渲染、用户交互、Shadow DOM 隔离、Canvas 曲线绘制 |
| `background.js` | 后台服务：设置存储管理、消息路由、预设管理、数据迁移 |
| `popup.js` | 弹出窗口：快捷开关、状态显示、自定义确认弹窗 |
| `shared/constants.js` | 共享常量：频率表、预设数据、效果定义、默认值 |

### UI 特性

- **Shadow DOM 隔离**：所有 UI 元素在 Shadow DOM 内渲染，避免与宿主页面样式冲突
- **悬浮按钮 (FAB)**：右下角快速访问入口
- **实时曲线显示**：Canvas 绘制 EQ 响应曲线
- **频谱分析器**：实时显示输入/输出频谱

---

## 安装与使用

### 安装

1. 将插件目录放入 MoeKoeMusic 的插件目录
2. 重启 MoeKoeMusic（托盘 → MoeKoeMusic → 重启应用）

### 使用

1. 播放音乐后，点击页面右下角悬浮按钮打开 EQ 面板
2. 选择内置预设或手动调节各频段增益
3. 开启「音效增强」获得更丰富的音频处理
4. 可保存自定义预设供后续使用

---

## 注意事项

- 首次安装需重启 MoeKoeMusic 应用
- 播放音频时插件自动激活
- 说明一下，这个是用 AI 写的插件，可能存在 bug，是否使用需自行考量

---

## 预览

<img width="822" height="594" alt="image" src="https://github.com/user-attachments/assets/cf410d03-9e61-4258-9c09-a8b26fb98ad6" />
<img width="816" height="902" alt="image" src="https://github.com/user-attachments/assets/ddbc6c84-da24-4b16-8fc9-96708aa44dac" />
<img width="816" height="561" alt="image" src="https://github.com/user-attachments/assets/8c6c1072-5844-4059-9d56-dce659059199" />
<img width="1452" height="122" alt="image" src="https://github.com/user-attachments/assets/de66e96f-14f3-4990-9564-675f5a7dafe0" />


                                         旧版本
               
<img width="1283" height="1064" alt="EQ面板" src="https://github.com/user-attachments/assets/60b8e41e-a668-4806-890a-8af9b6f845ae" />

<img width="1283" height="1440" alt="完整界面" src="https://github.com/user-attachments/assets/9235f10e-29db-4aaf-99ed-3d76579150f3" />

<img width="777" height="172" alt="弹出窗口" src="https://github.com/user-attachments/assets/5be9853d-2be6-46ff-b82c-a1c99d741fc8" />
