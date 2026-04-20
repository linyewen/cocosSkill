---
name: cocos-widget-decision
description: 判断某节点要不要加 Widget、layer 容器要不要 Widget 45、组件想贴屏幕边不知道怎么配、混合需求（跟随世界坐标 + tween 到屏幕终点）怎么实现、节点归属哪个 Layer 时调用。给出三问决策树 + trade-off 表 + 手算指导。只要遇到"贴屏适配"或"Widget 要不要加"的纠结，就先读这个 skill。
---

# Widget 取舍与 Layer 归属决策

> **姊妹 skill**：`scene-setup`（场景整体搭建流程）、`cocos-prefab-crud`（prefab/scene JSON 操作纪律）、`ui-design`（UI 从效果图到节点）。本 skill 只回答**单点决策**："这里该不该加 Widget？"

---

## 核心观念（先校准认知）

Widget **不是"适配开关"**，不要理解成"加 Widget = 适配了 / 没加 = 不适配"。

正确理解：
- **Canvas 组件本身**就是全局适配器（FitHeight / FitWidth 把实际屏幕映射到设计分辨率）。所有节点**自动**在设计分辨率坐标系里运行，不需要手动"开"适配。
- **Widget** 是"贴实际屏幕边"的工具。只有需要**追踪实际屏幕边**（而不是按设计坐标固定）的节点才需要它。

举例：
- 战机 `position=(0, -500)` —— 不需要 Widget，Canvas 会自动缩到屏幕对应位置
- HUD 金币数想贴右上角 —— 需要 Widget，因为"屏幕右上"在不同手机上 y 值不同

---

## 三问决策树：某节点要不要加 Widget？

### 问 1：这个节点是"贴屏幕边"还是"按世界坐标"？

| 定位 | 典型例子 | 决策 |
|---|---|---|
| 按世界坐标 | 战机、子弹、方块、飘字、爆炸、道具 | **不加 Widget**，结束 |
| 贴屏幕边 | HUD 金币、全屏 UI、背景铺满 | 需要 Widget，**继续问 2** |

### 问 2：这个节点（或它的容器）以后有整体 tween 需求吗？（震屏 / 缩放 / 位移）

| 有 tween 需求 | 决策 |
|---|---|
| ✓ 有（如 gameLayer 要震屏）| **不加 Widget**。Widget 会在屏幕事件触发时覆盖 position，把正在 tween 的值拉回 (0,0)。换做法：把"贴屏"功能交给**子节点**做，容器保持干净；或震屏用 Camera 代替（注意 3D z=1000 的安全问题） |
| ✗ 没 tween | **继续问 3** |

### 问 3：parent 已经是 Widget 45 了吗？

| 情况 | 决策 |
|---|---|
| parent 已 Widget 45 | 节点直接加 Widget 贴对应边，**结束** |
| parent 不是 Widget 45 | 三选一（按优先级）：<br>① **把节点挪到已 Widget 45 的容器下**（推荐，语义清晰）<br>② 让 parent 加 Widget 45（如果 parent 本来也是 UI 容器）<br>③ 自己 Widget 的 `target` 指向 Canvas（兜底，不推荐） |

---

## Widget 两层原则（铁律）

> **一个节点要贴屏幕某边，它的 Widget 参照节点（默认 parent）的 contentSize 必须是实际视口大小。标准做法：父容器自己 Widget 45 拉满，子节点再 Widget 贴对应边。**

### 原理

Widget 算法 = **"读 target.contentSize（默认 parent），算出自己的 position/size"**。

- parent.contentSize = 视口大小 → 算出的"贴边位置"在真实屏幕边
- parent.contentSize = 0 或其他值 → 算出的"贴边位置"是错的

### 标准结构

```
uiLayer       [Widget _alignFlags=45, 四边=0]   ← 容器先 Widget 45 把 contentSize 撑到视口
  └─ pauseBtn [Widget TOP=20, LEFT=20]          ← 组件再贴视口边
```

### 反例

```
gameLayer   [不 Widget，contentSize=默认/0]
  └─ pauseBtn [Widget TOP+LEFT]   ← 贴到 gameLayer 的假边，位置离谱
```

---

## gameLayer / effectLayer 不加 Widget 的 4 个理由

**核心对比**：方案 A（默认不加）vs 方案 B（加 Widget 45）

| 差异点 | A（推荐）| B（坑）|
|---|---|---|
| **整体 tween**（震屏/缩放）| tween 由脚本控制，干净不打架 | Widget 在 resize / 旋转屏 / 软键盘弹起时覆盖 position 回 (0,0)，tween 被瞬间复位 |
| **下游 Widget 容错**| contentSize=0 让子孙 Widget **立即出错**，开发期就暴露 | contentSize=视口**静默兜住**子孙 Widget 错误挂靠，上线才炸 |
| **Mask / 触摸命中**| 不需要（游戏对象各自判断飞出/触屏）| 支持但游戏层用不到 |
| **语义纯净度**| "游戏世界容器" 概念纯 | "贴屏容器"但里面都是世界坐标对象，语义矛盾 |

**结论**：
- **gameLayer**（游戏世界容器）→ 不加 Widget
- **effectLayer**（世界坐标特效）→ 不加 Widget
- 如果真需要全屏贴屏反馈（全屏泛红），**另建节点挂到 uiLayer 下**，不要把 effectLayer 改成 Widget 45

---

## Widget.target 冷知识

Widget 默认读 **parent** 的 contentSize。`target` 属性可以改参照：

```typescript
const widget = node.getComponent(Widget);
widget.target = canvasNode;   // 不读 parent，改读 Canvas.contentSize（=视口）
widget.alignFlags = 45;
```

**何时用**：没有合适父容器的兜底。

**99% 情况不该用**：如果你发现需要用 target，大概率说明节点**摆错了容器**——把它挪到已 Widget 45 的 `hudLayer` / `uiLayer` 下更对。

---

## 混合需求：跟随世界坐标 + 贴屏终点

**典型场景**：CRIT! 文字在命中点冒出 → 飘向屏幕顶部吸收。

**核心原则**：**不加 Widget，脚本手算**。

```typescript
// 1. 生成时：设置世界坐标（命中点）
node.setWorldPosition(hitWorldPos);

// 2. 目标位置：用 Canvas UITransform 反算屏幕顶的世界坐标
const canvasUT = canvasNode.getComponent(UITransform)!;
const localTop = v3(0, canvasUT.contentSize.height / 2 - 50, 0);
const topWorld = canvasUT.convertToWorldSpaceAR(localTop);

// 3. tween 世界坐标
tween(node)
  .to(0.5, { worldPosition: topWorld }, { easing: 'quadOut' })
  .call(() => node.destroy())
  .start();
```

**为什么不 Widget**：Widget + tween worldPosition 会打架——Widget 在帧末/事件回调覆盖 position，跟随动画失效。

---

## 节点归属 Layer 速查表

| 业务角色 | 归属 Layer | Widget 情况 |
|---|---|---|
| 战机 / 敌人 / 子弹 / 道具方块 | `gameLayer` | ✗ 世界坐标 |
| 跟随命中点的特效（飘字 / 爆炸 / CRIT!） | `effectLayer` | ✗ 世界坐标 |
| HUD 金币 / 分数 / 血条（贴屏角）| `hudLayer` | ✓ 容器 45 + 组件贴对应角 |
| 全屏 UI（菜单 / 结算 / 暂停 / 引导）| `uiLayer` | ✓ 容器 45 + View prefab 根 45 |
| 全屏反馈（屏幕泛红 / 白屏闪）| `uiLayer` 下独立 Sprite | ✓ Widget 45 |
| 背景 | `bgLayer`（容器透传）+ bg Sprite 自己 45 | ✓ bg Sprite 贴实际屏幕（含安全区）|
| 跟随某游戏对象的挂件（战机头顶等级 / 血条）| 游戏对象自己作为父节点的子节点 | ✗ 局部坐标 |

### 边界案例判断

**Q: CRIT! 特效算游戏层还是 UI 层？**
- 命中位置冒出 → 世界坐标 → `effectLayer` ✓
- 若产品要求"飘到屏幕顶"，用【混合需求】手算法，**不要**为此挪到 uiLayer

**Q: 全屏泛红算特效层还是 UI 层？**
- 要贴全屏 → 需要 Widget 45 → 挂 `uiLayer`
- 理由：effectLayer 保持纯世界坐标，不让 Widget 污染语义

**Q: 游戏 pause 弹窗算 UI 层？**
- 全屏遮罩 + 按钮 → `uiLayer`，走全屏 prefab 标准（Widget 45 + mask + content）

---

## 常见 Anti-pattern（遇到就停下）

### ❌ Anti-pattern 1：震屏被 Widget 复位

```
gameLayer [Widget _alignFlags=45]   ← 错
  └─ block
  
tween(gameLayer).to(0.1, {position: v3(5,5,0)})  // 震屏
// 屏幕旋转 / 软键盘 / updateAlignment → Widget 把 position 拉回 (0,0)
```

**修正**：gameLayer 不加 Widget。震屏需求下容器必须干净。

### ❌ Anti-pattern 2：parent.contentSize=0 下加 Widget 子

```
gameLayer [不 Widget，contentSize=0]
  └─ someHud [Widget TOP+LEFT]   ← 贴到假边
```

**修正**：someHud 挪到 hudLayer 下（hudLayer 自己 Widget 45）。

### ❌ Anti-pattern 3：全屏反馈挂 effectLayer

```
effectLayer [不 Widget]
  └─ redFlash [Sprite + Widget 45]   ← Widget 找不到视口参照
```

**修正**：redFlash 挪到 uiLayer 下，常驻隐藏，失败时闪一下。

### ❌ Anti-pattern 4：用 Widget 做跟随动画

```
CRIT! 节点 [Widget TOP=20]
tween(node).to(0.5, { worldPosition: topWorld })   ← 和 Widget 打架
```

**修正**：不加 Widget，用 `convertToWorldSpaceAR` 手算目标世界坐标 + tween worldPosition（见【混合需求】）。

### ❌ Anti-pattern 5：把 gameLayer 当 UI 容器用

```
gameLayer [Widget 45]
  └─ coinLabel [Widget TOP+RIGHT]   ← 金币数本该在 hudLayer
```

**修正**：HUD 元素归 hudLayer，gameLayer 只放游戏世界对象。节点树应该反映业务分层。

---

## 检查清单（创建新节点 / 新 prefab 时自检）

- [ ] 这个节点的业务角色是"贴屏"还是"世界坐标"？
- [ ] 如果贴屏，parent 是否是 Widget 45？如果不是，能否换容器而不是改 target？
- [ ] 如果世界坐标，是否**没有**加 Widget？
- [ ] gameLayer / effectLayer 根节点是否**没有** Widget？
- [ ] 这个节点或容器有整体 tween 需求吗？有则绝不加 Widget
- [ ] 如果有混合需求（跟随世界 + 飘到屏幕某处），是否用手算而不是 Widget？
- [ ] 全屏反馈（泛红 / 白屏）是否挂在 uiLayer 下而不是 effectLayer？

---

## 回流提醒

本 skill 如有改动，按 CLAUDE.md 10.4 铁律回流：

```bash
cp ~/.claude/skills/cocos-widget-decision/SKILL.md \
   ~/cocosSkill/skills/cocos-widget-decision/SKILL.md
cd ~/cocosSkill
git add skills/cocos-widget-decision/
git commit -m "update: cocos-widget-decision"
git push
```
