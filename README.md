# Gantt Chart - 甘特图桌面应用

一个轻量级甘特图桌面应用，基于 **Neutralinojs + React + Canvas** 构建，单个可执行文件仅 **~1 MB**。

![Gantt Chart Screenshot](assets/screenshot.png)

## 📋 功能特性

### 核心功能

- **交互式甘特图绘制**
  - 点击空区域创建任务条 ▬
  - 单击创建里程碑 ◆
  - 拖拽调整任务条位置和时长
  - 任务依赖关系可视化
  - 实时缩放（工具栏 +/- 按钮）
  - 今日标记线

- **灵活的时间轴**
  - 多层级时间刻度（年、月、周、日，智能隐藏）
  - 日期范围快速选择（1/3/6/12 个月或全部）
  - 时间轴字体大小可调

- **泳道管理**
  - 多层级泳道结构
  - 自定义泳道名称
  - 拖拽重排泳道顺序

- **模板管理**
  - 保存当前项目为模板（最多 10 个）
  - 加载 / 重命名 / 删除已保存模板
  - 模板持久化到本地文件系统，重启不丢失

- **数据导入导出**
  - Excel 数据导入（支持中英文列名，自动清空旧数据）
  - Excel 数据导出（任务、里程碑、依赖、泳道）
  - PNG/JPEG 图片导出（1x/2x/3x 分辨率）

### 用户体验

- 🎨 现代化 UI 设计，右侧属性面板实时编辑
- ⚡ Canvas 分层渲染 + 脏标记调度，极速流畅
- ⌨️ 键盘快捷键全支持
- 🔄 自动保存（每 30 秒 + 窗口关闭时）
- 📊 任务进度滑块、颜色选择器

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Neutralinojs** | 轻量跨平台桌面框架（~1.6 MB 运行时，不打包 Chromium） |
| **React 18** | UI 组件库 |
| **TypeScript** | 类型安全的 JavaScript |
| **Canvas API** | 高性能图形渲染（8 层分层渲染） |
| **Zustand** | 轻量级状态管理 |
| **XLSX** | Excel 文件处理 |
| **Webpack** | 模块打包工具 |

### 为什么选择 Neutralinojs？

对比常用的 Electron，体积从天到地：

| | Electron | Neutralinojs |
|------|:---:|:---:|
| 运行时 | 打包完整 Chromium (~60 MB) | 使用系统 WebView2 (0 MB) |
| 单文件体积 | 66 MB | **~1 MB** |
| 内存占用 | ~150 MB+ | ~50 MB |
| Canvas 性能 | 取决于 Chromium 版本 | 取决于 Edge WebView2 |

## 🚀 快速开始

### 环境要求

- Windows 10/11（内置 WebView2 运行时）
- Node.js 18.0 或更高版本
- npm 9.0 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/Franklin-67/Gantt_Chart.git

# 进入项目目录
cd Gantt_Chart

# 切换到 Neutralinojs 分支
git checkout neutralino-migration

# 安装依赖
npm install
```

### 运行开发版本

```bash
npm run neu:dev
```

### 构建发布版本

```bash
# 一键构建（构建 React + 下载运行时 + 打包）
npm run neu:build

# 输出文件位于 release/gantt-chart/ 目录：
#   gantt-chart.exe   1.7 MB   ← 双击运行
#   resources.neu     0.6 MB   ← 应用资源（自动加载）
```

### 合成单文件 EXE

```bash
# 将两个文件合并为一个（需要 .NET Framework，Windows 自带）
powershell -File scripts/make-sfx.ps1

# 输出：
#   release/GanttChart.exe   ~976 KB   ← 单文件，双击即用
```

### 打包安装程序（可选）

```bash
# 需要先安装 Inno Setup: https://jrsoftware.org/isdl.php
# 然后用 scripts/package.iss 编译出标准安装包
```

## 📦 体积对比

| 版本 | 文件 | 体积 |
|------|------|:---:|
| Electron (master 分支) | Gantt Chart.exe | 66 MB |
| Neutralinojs (当前分支) | gantt-chart.exe + resources.neu | 2.2 MB |
| Neutralinojs 单文件 | GanttChart.exe | **976 KB** （-98.5%） |

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `S` | 选择模式 |
| `B` | 创建任务条模式 |
| `M` | **创建里程碑模式** |
| `L` | 创建依赖线模式 |
| `Delete` | 删除选中任务/里程碑 |
| `← →` | 左右移动选中项目 |
| `↑ ↓` | 移动选中项目到上/下泳道 |

## 📁 项目结构

```
gantt-addin/
├── src/
│   ├── components/           # React 组件
│   │   ├── canvas/          # Canvas 渲染（8 层独立图层）
│   │   │   ├── GanttCanvas.tsx       # 主画布组件
│   │   │   ├── BarRenderer.tsx       # 任务条渲染
│   │   │   ├── TimelineHeader.tsx    # 时间轴头部
│   │   │   ├── GridBackground.tsx    # 网格/周末/假日背景
│   │   │   ├── DependencyRenderer.tsx # 依赖关系线
│   │   │   ├── SwimlaneRenderer.tsx  # 泳道行
│   │   │   ├── LabelRenderer.tsx     # 任务标签
│   │   │   ├── DragOverlay.tsx       # 拖拽预览
│   │   │   └── SelectionOverlay.tsx  # 选中高亮
│   │   ├── dialogs/         # 对话框
│   │   ├── layout/          # 布局组件
│   │   └── common/          # 通用组件（ErrorBoundary 等）
│   ├── engine/               # 渲染引擎
│   │   ├── renderer/        # LayerManager + RenderScheduler（脏标记调度）
│   │   ├── interaction/     # InteractionManager + HitTestEngine + DragStateMachine
│   │   └── export/          # 图片导出引擎
│   ├── model/                # 数据模型
│   │   ├── types.ts          # 完整的 TypeScript 类型定义
│   │   └── defaults.ts       # 默认配置（颜色、尺寸、时间刻度）
│   ├── services/             # 业务服务
│   │   ├── excelService.ts           # Excel 导入
│   │   ├── excelExportService.ts     # Excel/图片导出
│   │   ├── storageService.ts         # 项目 & 模板持久化
│   │   ├── storageManager.ts         # 多层存储引擎（文件 → Neutralino storage → localStorage）
│   │   └── neutralinoManager.ts      # Neutralino 运行时初始化
│   ├── store/                # Zustand 全局状态
│   ├── utils/                # 工具函数
│   ├── types/                # 类型声明（Neutralino 类型等）
│   ├── App.tsx               # 主应用组件
│   ├── index.tsx             # 入口文件
│   └── index.css             # 全局样式
├── assets/
│   └── icons/
├── scripts/
│   ├── bundle-release.js     # 自动构建脚本（下载运行时 + 打包）
│   └── make-sfx.ps1          # 单文件 EXE 合成脚本
├── neutralino.config.json    # Neutralinojs 配置
├── package.json
├── webpack.config.js
├── .eslintrc.json
└── README.md
```

## 🎯 使用说明

### 创建任务

1. 点击工具栏 **▬** 按钮（或按 `B`）进入"创建任务"模式
2. 在时间轴上按住并**拖拽** → 释放后生成一个蓝色任务条
3. 选中后在右侧属性面板修改名称、日期、进度、颜色

### 创建里程碑

1. 点击工具栏 **◆** 按钮（或按 `M`）进入"创建里程碑"模式
2. 在时间轴上**单击** → 在该日期生成一个红色菱形◆
3. 选中后在右侧属性面板修改名称、日期、颜色

### 编辑项目

- **拖拽**：选中后拖拽任务条整体移动
- **调整时长**：拖拽任务条左右边缘
- **删除**：选中后按 `Delete` 键
- **移动泳道**：拖拽泳道左侧标题区上下移动

### 创建依赖关系

1. 点击工具栏 **↗** 按钮（或按 `L`）
2. 点击源任务 → 点击目标任务
3. 依赖线自动生成（完成-开始 FS 类型）

### 模板管理

1. 编辑好甘特图内容后，点击工具栏"保存模板"按钮
2. 输入模板名称 → 保存
3. 下次启动时，启动画面会显示已保存的模板数量
4. 选择"加载模板" → 选择模板 → 加载
5. 模板保存在本地文件系统中（`.storage/` 目录），应用重启不丢失

### 数据导入

1. 点击工具栏"导入 Excel"
2. 选择 `.xlsx/.xls/.csv` 文件
3. **导入前自动清空当前画布所有内容**
4. 支持中英文列名自动匹配（任务名称、开始日期、结束日期、泳道、进度、颜色、备注）

### 数据导出

| 格式 | 方式 |
|------|------|
| **Excel 表格** | 工具栏"导出 Excel" → 保存为 .xlsx |
| **PNG/JPEG 图片** | 工具栏"导出图片" → 选择分辨率 (1x/2x/3x) → 保存 |

## 🔧 配置选项

### 时间轴配置

在 `src/model/defaults.ts` 中修改：

```typescript
export const SWIMLANE_ROW_HEIGHT = 40;        // 泳道行高
export const SWIMLANE_HEADER_WIDTH = 180;      // 泳道标题宽度
export const BAR_HEIGHT = 20;                  // 任务条高度
export const DEFAULT_TIME_SCALES = [           // 时间刻度层级
  { unit: TimeUnit.Year, height: 22, visible: true },
  { unit: TimeUnit.Month, height: 24, visible: true },
  { unit: TimeUnit.Week, height: 20, visible: true },
  { unit: TimeUnit.Day, height: 20, visible: false }, // 默认隐藏
];
```

### 颜色配置

在 `src/model/defaults.ts` 中自定义配色方案（12 种预设颜色）。

## 🧪 开发指南

### 添加新的渲染层

1. 在 `src/components/canvas/` 创建渲染组件
2. 在 `LayerManager` 的 `LAYER_DEFS` 数组中注册新图层
3. 在 `GanttCanvas` 的 `LAYER_RENDERERS` 中注册渲染函数

### 技术架构

```
用户操作 → InteractionManager（指针/键盘事件）
         → Store（Zustand 状态更新）
         → RenderScheduler（脏标记调度）
         → LayerManager（8 层 Canvas，仅渲染脏层）
         → 屏幕输出（60fps 流畅渲染）
```

## 📝 更新日志

### v0.2.2 (2026-05-30)
- ✅ 修复模板下拉菜单被工具栏裁剪遮挡（overflow-y: hidden）
- ✅ 修复 Excel 导入泳道创建不全（Zustand 快照过期导致同名泳道被跳过）
- ✅ 修复缩放后图表右侧出现大片空白（pixelsPerDay 基于缓存的 viewportWidth，与实际 DOM 宽度不一致）
- ✅ 窗口大小变化时自动重算 pixelsPerDay，图表始终填满可视区域
- ✅ 导入 Excel 后自动调用 fitViewToContent 适配全部数据

### v0.2.1 (2026-05-30)
- ✅ 新增模板管理功能（保存 / 加载 / 重命名 / 删除），最多 10 个
- ✅ 模板持久化到本地文件系统（多层存储引擎），重启不丢失
- ✅ 修复 Excel 导入时无法读取本地文件的问题
- ✅ 修复 Excel 导入列名匹配失败的问题（`!0` 判空 bug）
- ✅ 导入 Excel 时自动清空当前画布所有内容
- ✅ 完善 Console 诊断日志，便于排查问题

### v0.2.0 (2026-05-27)
- ✅ 从 Electron 迁移到 Neutralinojs（体积 66 MB → 2.2 MB）
- ✅ 新增单文件打包，合成后仅 ~976 KB
- ✅ 新增里程碑创建功能（工具栏 ◆ 按钮 + M 快捷键）
- ✅ 新增 React ErrorBoundary 错误边界
- ✅ 窗口关闭自动保存
- ✅ 新增 ESLint 配置
- ✅ 优化日期格式化（消除重复代码）
- ✅ Electron 版本保留在 master 分支

### v0.1.0 (2025-05-24)
- ✅ 完成基础甘特图功能（Electron 版本）

## 🌿 分支说明

| 分支 | 框架 | 包体积 |
|------|------|:---:|
| `master` | Electron | 66 MB |
| `neutralino-migration`（当前） | Neutralinojs | ~1 MB |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证

## 👨‍💻 作者

**Franklin-67**
- GitHub: [https://github.com/Franklin-67](https://github.com/Franklin-67)

## 致谢

- [Neutralinojs](https://neutralino.js.org/) - 轻量级桌面应用框架
- [React](https://react.dev/) - UI 组件库
- [XLSX](https://sheetjs.com/) - Excel 文件处理库
- 所有开源贡献者

---

⭐ 如果这个项目对您有帮助，请 star 支持一下！
