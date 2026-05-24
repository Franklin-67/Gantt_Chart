# Gantt Chart - 甘特图桌面应用

一个功能强大的甘特图桌面应用程序，基于 Electron + React + Canvas 构建，提供直观的可视化项目管理体验。

![Gantt Chart Screenshot](assets/screenshot.png)

## 📋 功能特性

### 核心功能

- **交互式甘特图绘制**
  - 拖拽调整任务条
  - 实时缩放和平移
  - 任务依赖关系可视化
  - 任务栏颜色自定义

- **灵活的时间轴**
  - 多层级时间刻度（年、月、周、日）
  - 智能日期范围显示
  - 今日标记线
  - 自动适应视图范围

- **泳道管理**
  - 多层级泳道结构
  - 自定义泳道标题
  - 折叠/展开功能
  - 动态高度调整

- **数据导入导出**
  - Excel 数据导入
  - Excel 图表导出
  - PNG 图片导出
  - SVG 矢量图形导出

### 用户体验

- 🎨 现代化 UI 设计
- ⚡ 流畅的动画效果
- ⌨️ 键盘快捷键支持
- 🔄 实时数据同步
- 📊 多任务并行显示

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Electron** | 跨平台桌面应用框架 |
| **React 18** | UI 组件库 |
| **TypeScript** | 类型安全的 JavaScript |
| **Canvas API** | 高性能图形渲染 |
| **Zustand** | 轻量级状态管理 |
| **XLSX** | Excel 文件处理 |
| **Webpack** | 模块打包工具 |

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 9.0 或更高版本
- Windows 10/11 (当前支持)

### 安装

```bash
# 克隆仓库
git clone https://github.com/Franklin-67/Gantt_Chart.git

# 进入项目目录
cd Gantt_Chart

# 安装依赖
npm install
```

### 运行开发版本

```bash
# 启动开发服务器
npm run dev
```

### 构建生产版本

```bash
# 构建应用
npm run build

# 打包为 Windows 便携版
npm run package
```

构建完成后，可执行文件位于 `release/` 目录。

## 📁 项目结构

```
gantt-addin/
├── src/
│   ├── components/          # React 组件
│   │   ├── canvas/         # Canvas 渲染组件
│   │   │   ├── GanttCanvas.tsx      # 主画布组件
│   │   │   ├── BarRenderer.tsx      # 任务条渲染
│   │   │   ├── TimelineHeader.tsx   # 时间轴头部
│   │   │   ├── GridBackground.tsx   # 网格背景
│   │   │   ├── DependencyRenderer.tsx  # 依赖关系线
│   │   │   ├── DragOverlay.tsx      # 拖拽覆盖层
│   │   │   └── SelectionOverlay.tsx # 选择覆盖层
│   │   ├── dialogs/       # 对话框组件
│   │   └── layout/        # 布局组件
│   ├── engine/             # 渲染引擎
│   │   ├── export/        # 导出引擎
│   │   ├── interaction/   # 交互引擎
│   │   └── renderer/       # 渲染调度
│   ├── model/              # 数据模型
│   │   ├── types.ts        # TypeScript 类型定义
│   │   └── defaults.ts     # 默认配置
│   ├── services/           # 业务服务
│   │   ├── excelService.ts        # Excel 操作
│   │   ├── excelExportService.ts  # 导出服务
│   │   └── storageService.ts      # 存储服务
│   ├── store/              # 状态管理
│   ├── utils/              # 工具函数
│   └── App.tsx             # 主应用组件
├── assets/                  # 静态资源
│   └── icons/             # 应用图标
├── dist/                   # 构建输出
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 🎯 使用说明

### 基本操作

1. **创建任务**
   - 点击时间轴空白区域创建新任务
   - 或使用工具栏的"添加任务"按钮

2. **编辑任务**
   - 双击任务条打开编辑对话框
   - 修改任务名称、开始日期、结束日期等

3. **调整任务时长**
   - 拖拽任务条左右边缘调整开始/结束日期
   - 拖拽任务条中间部分移动整个任务

4. **设置依赖关系**
   - 选中任务后，拖拽任务条上的依赖点
   - 连接到目标任务创建依赖

5. **缩放时间轴**
   - 使用鼠标滚轮缩放
   - 或通过工具栏选择时间刻度级别

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 开始/暂停任务 |
| `Delete` | 删除选中任务 |
| `Ctrl + C` | 复制任务 |
| `Ctrl + V` | 粘贴任务 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` | 重做 |
| `+/-` | 缩放时间轴 |
| `←/→` | 左右滚动时间轴 |

### 数据导入

1. 点击菜单"文件" → "导入 Excel"
2. 选择 Excel 文件
3. 映射列到任务属性
4. 确认导入

### 数据导出

支持多种导出格式：
- **Excel 图表**：保留所有数据和格式
- **PNG 图片**：高分辨率图片
- **SVG 矢量图**：无损缩放

## 🔧 配置选项

### 时间轴配置

在 `src/model/defaults.ts` 中修改时间轴默认设置：

```typescript
export const DEFAULT_TIME_CONFIG = {
  pixelsPerDay: 40,        // 每天像素数
  minPixelsPerDay: 10,     // 最小缩放级别
  maxPixelsPerDay: 200,    // 最大缩放级别
  weekStartDay: 1,         // 周起始日 (1=周一)
};
```

### 样式配置

在 `src/model/defaults.ts` 中自定义颜色方案：

```typescript
export const DEFAULT_COLORS = {
  primary: '#3b82f6',      // 主色调
  secondary: '#6366f1',    // 次要色调
  taskBar: '#10b981',      // 任务条颜色
  dependency: '#94a3b8',   // 依赖线颜色
  today: '#ef4444',        // 今日标记颜色
};
```

## 🧪 开发指南

### 添加新的渲染层

1. 在 `src/components/canvas/` 创建新的渲染组件
2. 在 `LayerManager` 中注册新图层
3. 实现 `render()` 方法

```typescript
// 示例：自定义渲染层
export class CustomRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}
  
  render(state: GanttState, bounds: Rect): void {
    // 渲染逻辑
  }
}
```

### 扩展任务类型

在 `src/model/types.ts` 中定义新的任务类型：

```typescript
export interface CustomTask extends BaseTask {
  customProperty: string;
  metadata?: Record<string, any>;
}
```

## 📝 更新日志

### v0.1.0 (2025-05-24)
- ✅ 完成基础甘特图功能
- ✅ 实现 Canvas 渲染引擎
- ✅ 支持任务拖拽和调整
- ✅ 依赖关系可视化
- ✅ Excel 导入导出
- ✅ 多层级时间轴显示
- ✅ 泳道管理功能

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

**Franklin-67**
- GitHub: [https://github.com/Franklin-67](https://github.com/Franklin-67)

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - UI 组件库
- [XLSX](https://sheetjs.com/) - Excel 文件处理库
- 所有开源贡献者

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: [https://github.com/Franklin-67/Gantt_Chart/issues](https://github.com/Franklin-67/Gantt_Chart/issues)

---

⭐ 如果这个项目对您有帮助，请 star 支持一下！
