---
name: new-game
description: 从策划案 + 美术资源到可运行完整游戏的 7 阶段流程。每阶段有明确产出物 + 用户确认点，不跳步。
---

# 从策划案 + 美术资源生成完整游戏

你是一个 Cocos Creator 游戏工厂。输入策划案和美术资源，输出可运行的完整游戏 + 多个差异化变体。

**严格按以下阶段执行，不跳步，每步完成后向用户确认再进下一步。**

---

## 阶段 0：前置对齐（不写代码，10 分钟）

### 0.1 工具链就位检查

开工前先确认：
- `~/cocosSkill/` 已 clone 且 `bash install.sh` 跑过
- `~/.claude/CLAUDE.md` 和 `~/.claude/skills/` 存在
- Cocos Creator 3.8.x 已打开
- MCP（若用）连接正常

若缺任一 → 告诉用户执行对应命令。

### 0.2 项目目录初始化

```bash
bash ~/cocosSkill/init_project.sh D:/minigame/<new-game>
# 自动 cp lib/*.ts / scripts/*.py / commands/*.md 到目标项目
```

### 0.3 平台约定（策划案常漏，必问）

明确 5 项（缺任一必须问用户）：
- **目标平台**：微信小游戏 / 抖音小游戏 / H5 / 独立应用
- **单局时长**：30s / 60s / 3min / 永续
- **分辨率**：竖版 600×1167 / 横版 1280×720 / ...
- **商业模式**：试玩广告（CTA 跳转）/ IAA（广告内变现）/ IAP（内购）
- **目标用户**：女性向 / 泛用户 / 硬核

**产出物**：`docs/platform.md` 记录以上 5 项。

---

## 阶段 1：理解（不写代码，30 分钟）

### 1.1 读策划案

- 读取用户提供的策划文档（.docx / .md / .txt）
- 提取：核心玩法循环、胜负条件、关卡流程、数值体系
- 如果没有策划文档 → 询问用户口述核心玩法

**检查策划案覆盖度**：按 `cocosSkill/templates/GDD_PLAYABLE_30S_TEMPLATE.md` 对照，缺哪章就追问策划：
- Ch 1 情绪曲线 / 核心爽点写清楚了吗？
- Ch 3 每个单位都有"职责 + 生成规则 + 视觉描述"吗？
- Ch 4 升级意图写清楚了吗？
- Ch 6 反馈系统的"玩家做 X 要感到 Y"表格有吗？
- Ch 7 胜负条件 + CTA 跳转接口写了吗？

**原则**：策划不写具体数值和时间轴（AI 补），但必须写清楚意图和约束。

### 1.2 看效果图 / 流程图

- 读取所有图片（.png / .jpg），理解视觉风格和交互流程
- 提取：画面风格、UI 布局、操作方式、关键帧节点

**⚠️ 必做**：`ui-design` skill 的"第一步：阅读素材"→ 不能跳过直接拼。

### 1.3 清点美术资源

扫描资源文件夹，按类型分类列出：

| 类别 | 数量 | 规格 | 归属目录 |
|---|---|---|---|
| 角色 / 敌人 | N 套 × M 帧动画 | 尺寸 WxH | `textures/` |
| 子弹 / 道具 | N 种 | 尺寸 WxH | `textures/` |
| UI 元素（按钮/图标/背景）| N 个 | 有无九宫格 | `textures/` |
| 特效（帧序列）| N 组 | 每组 N 帧 | `resources/` |
| 音效 | N 个 | 时长 / 格式 | `resources/sound/` |

**命名规范检查**：
- ❌ 中文：`玩家_1.png` / `发射音效.mp3`
- ✅ 英文：`player_1.png` / `shoot.mp3`

**meta 检查**：所有图片 meta 必须有 `sprite-frame` submeta（详见 `scene-setup` skill）。

### 1.4 输出理解文档

向用户确认：

```
核心循环：[一句话描述]
情绪曲线：[开头 X → 中段 Y → 尾段 Z]
目标时长：30s / 60s / ...
美术资源：N 种角色 / N 种敌人 / N 种特效 / N 个 UI 元素
预计场景分层：blockLayer / bulletLayer / uiLayer / popupLayer / ...
预计 prefab：[列出所有需要的 prefab]
数值空白点（AI 会自动设计）：波次 HP / 时间节点 / 升级阈值 / 暴击率 / ...
```

**等用户确认后再进入阶段 2**。

---

## 阶段 2：设计（不写代码，1-2 小时）

### 2.1 场景分层设计

调用 `cocos-layer` skill 设计场景层级：
- bg / gameLayer / effectLayer / uiLayer / popupLayer / fxLayer / guideLayer
- 每层是否需要 Widget 45（参考 `cocos-widget-decision` skill）

### 2.2 Prefab 清单设计

对每个游戏对象，按 `prefab-analyze` skill 先反推节点结构，再用 `cocos-create` 实际搭：

```
XxxPrefab (UITransform + 脚本 + 碰撞体)
├── shadow (Sprite)
├── icon (Sprite)     ← 主图，可独立做动画
├── shotNode (Node)   ← 射击点（如需）
└── effect (Node)     ← 特效容器（如需）
```

列出所有 prefab：名称 / 根节点组件 / 子节点结构 / 使用的贴图。

### 2.3 架构分层设计

调用 `game-architecture` skill 设计 5 层架构：

```
assets/Script/
├── app/          GameEntry / GameFSM / ModeController
├── manager/      BlockManager / BulletManager / SoundManager ...
├── entity/       Player / Enemy / Bullet / Coin ...
├── data/         GameConfig / GameState / GameEvents
├── ui/           MainMenuController / SettlementController ...
└── infra/        （已由 init_project.sh 放好 EventBus / SafePool 等）
```

- 如果是多模式游戏（闯关 / 无尽 / 试玩）→ 用模式控制器模式（参考 `game-architecture` skill）

### 2.4 数值设计（AI 补，策划没写的）

**时间轴**（30s 试玩广告为例）：
```
0-3s    教学阶段：第 1 波低 HP + 手势引导
3-7s    成长期：第 2 波 + 道具方块 A
7-14s   满级期：第 3 波 + 道具方块 B/C
14-24s  爽打期：高 HP 无道具
24-30s  Boss 决战
```

**数值曲线**：
- 子弹速度 / 射击间隔 / 暴击率 / 震屏强度 / 金币阈值 / Boss HP → 按时长反推
- 参考已有项目：ProjectDrop GameConfig.ts / BulletVariantConfig.ts

### 2.5 输出设计文档

向用户确认：
- `docs/architecture.md` — 架构 / prefab 清单 / 脚本职责
- `docs/waves.json` 或 `docs/waves.md` — 具体波次配置
- `docs/balance.md` — 手感参数表

**等用户确认后再进入阶段 3**。

---

## 阶段 3：实现基础版（3-6 小时）

### 3.0 复用脚本审查（复用已有脚本时必做）

如果复用其他项目的脚本，在使用前必须检查：
- 音效管理：是否独立为 SoundManager？不能全堆在 GameManager 里
- 全局状态：是否用单例管理？
- 未使用的 @property：声明了但代码中从未调用的删掉
- 架构分层：是否符合 CLAUDE.md 的组件设计模式？

**不符合规范的先重构再继续**，不要带着技术债往下做。

### 3.1 创建项目基础

- 场景搭建走 `scene-setup` skill 的 7 步流程（Camera 是 Canvas 子节点 / Widget 45 / 资源 meta 检查）
- 搬运美术资源到正确目录（英文命名 / meta 正确）
- `assets/Script/infra/` 用 init_project.sh 放好的 lib（不要重造 EventBus / SafePool）

### 3.2 创建 Prefab

按 `cocos-prefab-crud` skill 的流程：
1. 结构走编辑器（不用 Python 从零生成）
2. @property 绑定走 Python 编辑 JSON
3. 每次改动标刷新档位（🟢 / 🟡 / 🔴 / ⛔）

**每个 prefab 创建后验证**：
- 在编辑器中打开
- Inspector 的 @property 面板无红色 null
- SpriteFrame 无白方块

### 3.3 写脚本

按 2.3 的架构分层，按顺序：
1. `data/` 层（GameConfig / GameState / GameEvents）
2. `entity/` 层（Player / Enemy / Bullet）
3. `manager/` 层（XxxManager）
4. `app/` 层（GameEntry / GameFSM / ModeController）
5. `ui/` 层（Controller）

每个脚本遵守 `entity-lifecycle` / `manager-pattern` skill 的规范。

### 3.4 连线测试

- 所有 @property 编辑器里检查（见 `cocos-prefab-crud` 7 条流程的 D 步骤）
- 预览运行基础版
- 确认核心循环跑通：操作 → 反馈 → 进度 → 结局

**向用户演示基础版，确认可玩后再进入阶段 4**。

---

## 阶段 4：数值调优 + 手感打磨（2-4 小时）

### 4.1 玩测迭代循环

```
AI 实现 → 用户玩 1 局 → 记录 3-5 条问题 → AI 调整 → 再玩
```

**常见调整项**：
- 子弹速度 / 方块下落速度（手感关键）
- 震屏强度 / 动画时长（反馈质量）
- 金币阈值 / 升级节奏（进度节奏）
- Boss HP / 攻击间隔（挑战性）

### 4.2 前置让 AI 自查

让 AI 每次交付时自问：
- [ ] 暴击是否过于频繁或稀少？
- [ ] 升级瞬间有没有足够反馈（外观切换 + 音效 + 光效）？
- [ ] Boss 登场够不够有仪式感？
- [ ] 玩家失败时是否清楚原因？

### 4.3 用 DEV 面板 + 综合测试关辅助

参考 ProjectDrop 的 `DevPanelController` + 综合测试关（levelNo=999）：
- 一键装备任意弹型 / 给任意道具 / 跳任意关
- 把所有方块类型 / 道具 / Boss 放进同一关，一次测完

---

## 阶段 5：设计变体（可选，多模式游戏做）

### 5.1 变体设计原则

每个变体必须是**2-3 种经典机制的组合**，不是单一机制换皮。

三层框架：

| 层级 | 作用 | 节奏 |
|------|------|------|
| 操作层 | 每秒在做什么 | 1-2 秒 |
| 策略层 | 每 5 秒做一个决策 | 5-10 秒 |
| 成长层 | 30 秒内的变化弧线 | 全程 |

### 5.2 机制库

- **操作类**：射击、切割、拖拽、弹弓、挡板、点击放置
- **策略类**：资源分配、位置选择、风险博弈、时机判断、路径规划
- **成长类**：进化变大、buff 叠加、连锁范围递增、分裂倍增、combo 延长
- **环境类**：可破坏墙壁、重力井、火墙轨迹、反弹墙、陷阱地雷

### 5.3 实现变体

- 按"模式控制器模式"（`game-architecture` skill）
- 每个变体一个独立 Mode 类
- GameManager 只做分发，不写 `if (mode === 'xxx')` 业务逻辑
- 共享组件（BlockManager / BulletManager）提供能力，Mode 决定策略

---

## 阶段 6：测试 + 审查

### 6.1 代码审查

调用 `cocos-review` skill 过一遍：
- 架构违规（代码拼 UI / getChildByName / new Node 拼视觉）
- @property 无空判断
- 生命周期规范（onDestroy 清事件）

### 6.2 场景自检

`scene-setup` skill 末尾 12 项自检清单全过。

### 6.3 Playtest 验收

- 至少 3 个人玩 5 局（家人 / 同事 / 自己）
- 记录完整反馈清单
- 分"必改" / "建议改" / "不改"分类

### 6.4 性能审查

- 长期运行不卡（无尽模式玩 10 分钟）
- NodePool 回收正常（不爆内存）
- tween 不泄漏（切场景时清）

---

## 阶段 7：打包 + 上线

### 7.1 提交前清理

- `DEV_INFINITE_ITEMS` / 调试日志 / console.log 全关
- 未提交工作区分段 commit（主题清晰）
- 版本号更新

### 7.2 平台 SDK 集成

| 平台 | 跳转接口 |
|---|---|
| 抖音小游戏 | `tt.notifyMiniProgramPlayablestatus({ success, fail })` |
| 微信小游戏 | `wx.notifyMiniProgramPlayableStatus({ isEnd: true })` |

### 7.3 包大小优化

- 微信小游戏主包限制 < 4MB，超了分包
- 图片压缩（tinypng）
- 音效降码率

### 7.4 构建 + 上传

- Cocos Creator 构建为目标平台
- 本地 `preview` 测 3 次没问题再上传

---

## 产出物清单（按阶段）

| 阶段 | 产出物 |
|---|---|
| 0 | `docs/platform.md`（5 项约定）|
| 1 | `docs/understanding.md`（核心循环 / 美术清单 / 场景分层预估）|
| 2 | `docs/architecture.md` + `docs/waves.json` + `docs/balance.md` |
| 3 | 可跑的基础版 + 所有 prefab + 脚本 |
| 4 | 平衡过的基础版 + 调整日志 |
| 5 | 变体清单 + 每个变体的实现 |
| 6 | 审查报告 + playtest 反馈 |
| 7 | 正式构建包 + 上线 |

---

## 使用方式

### 全流程启动
```
"这是策划案 [路径]，美术资源在 [路径]，帮我生成游戏"
```

### 部分启动（推荐）
```
"我在阶段 3 需要你帮我实现 xxx 模块"
"阶段 4 手感不对，我玩过了有 5 条问题：..."
```

---

## 与其他 skill 的关系

| 场景 | 调哪个 skill |
|---|---|
| 项目启动前先理解再动手 | `project-kickoff`（更前置）|
| 设计架构 / 分层 | `game-architecture` |
| 设计单个实体 | `entity-lifecycle` |
| 设计 Manager | `manager-pattern` |
| 搭场景 | `scene-setup` |
| 做 UI | `ui-design` + `cocos-widget-decision` |
| 改 prefab / scene | `cocos-prefab-crud` |
| 手写 JSON | `cocos-component` |
| 3D 引擎做 2D 注意事项 | `cocos-3d-for-2d` |
| 审查代码 / 场景 | `cocos-review` |
| 复刻已有项目 | `cocos-replicate` |

---

## 反模式（遇到立刻停下）

- ❌ 跳过阶段 0-2 直接写代码
- ❌ 不看效果图就凭描述写 UI
- ❌ 用 `new Node()` + `addComponent()` 拼视觉
- ❌ `DEV_INFINITE_ITEMS` 忘记改 false 就发布
- ❌ 策划案缺章节（时长 / CTA / 反馈表），AI 自己瞎猜
- ❌ 复用旧脚本不审查直接搬
- ❌ 没 playtest 就说"做完了"
