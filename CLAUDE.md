# AI × Cocos Creator 游戏开发铁律

本文件是**硬性规则**。AI 辅助开发 Cocos Creator 3.x 项目时常驻加载，违反必回滚。
具体操作流程 / 组件字段 / 场景搭建步骤见各 skill。

---

## 一、核心哲学

### 1.1 逻辑 / 视觉分离
- 一个游戏对象有两个身份：**它是什么**（逻辑）和**它看起来像什么**（视觉）
- 改外观不应该影响碰撞和行为；同一视觉可以复用在不同逻辑上
- **做法**：逻辑组件（脚本/碰撞体）挂根节点，视觉组件（Sprite/Label）挂 `icon` 子节点

### 1.2 外观 / 行为分离
- 外观：编辑器可视化设定（贴图、颜色、大小、节点结构）
- 行为：代码控制（何时创建、放在哪、怎么移动、何时销毁）
- 编辑器擅长视觉调试，代码擅长逻辑控制 — **用代码拼外观就是放弃编辑器的优势**

### 1.3 模块化复用
- 看得见的实体 → **prefab**（最小可复用单元）
- 重复的节点结构 → **提取 prefab**
- 页面（View）管布局和生命周期，子元素（Item）管数据展示且必须有 `setData()` 方法

---

## 二、硬红线（违反必回滚）

### 2.1 Prefab 必须绑定代码

**能 prefab 的必须 prefab，prefab 必须绑定代码。**

每个 prefab 的游戏实体必须有自己的脚本组件，封装自身行为。游戏主脚本只负责调度（`instantiate + getComponent().方法()`），不在外部直接操作 prefab 内部的 tween/动画/状态。

**反模式检查**：看到 `instantiate(prefab)` 后紧跟 `tween(node)...` 或 `node.setPosition(...)` 循环更新，立即停下 —— 这些行为应该在 prefab 的组件里。

### 2.2 禁止代码拼 UI 外观

```typescript
// ❌ 用代码拼 UI
const node = new Node('Title');
node.addComponent(UITransform);
const label = node.addComponent(Label);

// ✅ 正确做法
const panel = instantiate(this.settlementPrefab);
panel.getComponent(SettlementUI).setData(stats);
```

**MCP 没开 → 提醒用户开 MCP**，不要用 `new Node()` + `addComponent()` 绕过。
**唯一例外**：纯逻辑容器（无视觉）、临时调试标记、一次性几何绘制。

### 2.3 @property 哲学

- 引用的节点/组件必须在编辑器中创建并绑定，代码中**直接使用**
- **不做空判断，不做 fallback**，运行时缺失就报错暴露问题
- **不用 `getChildByName` 做 fallback**（获取 prefab 内部子节点组件）
- **新增 @property 必须同步绑定**：代码声明和 JSON 绑定是**原子操作**，写完脚本后必须立刻用 Python 编辑 prefab/scene JSON 绑定 `__id__`，不能留到后面

### 2.4 Sub-Agent 委托必须携带规范

委托 sub-agent 创建场景/prefab/节点时，prompt 中**必须包含对应的具体规则**，不能只给"创建这些节点"。

Sub-agent 看不到 CLAUDE.md。如果 prompt 里只写节点名，agent 会用默认值创建，导致 Widget `_alignFlags=0`、Layout 缺失、节点堆叠 `(0,0)`。

**实施清单**：
1. 创建场景 → prompt 包含适配策略（参考 `ui-design` / `cocos-widget-decision`）
2. 创建 prefab → prompt 包含"根节点=逻辑，子节点=视觉"原则
3. 创建完成后 → 必须验证关键属性值（`_alignFlags` / `_contentSize` / `position`）

### 2.5 Scene JSON 编辑与编辑器同步

**绝对不要在编辑器打开场景时直接编辑 scene / prefab JSON 文件。**

编辑器在内存中维护场景状态。当编辑器保存时，会用内存中的状态覆盖磁盘文件。

**正确流程**：
```
MCP save_scene → 编辑 JSON → MCP open_scene 重新加载 → 不再 save_scene
```

- 尽量用 MCP API 替代直接编辑 JSON
- @property 绑定如果 MCP 不支持，编辑 JSON 后**必须立即 open_scene 重新加载**
- **open_scene 后不能再 save_scene**，否则编辑器内存中的 None 会覆盖绑定
- 编辑 JSON 前提醒用户**不要在编辑器中按 Ctrl+S**

详细流程见 `cocos-prefab-crud` skill 的"Prefab / Scene 绑定 7 条流程"。

---

## 三、工作态度

### 3.1 验证优先原则

**每个技术值必须有实测来源，不能靠推理。**

| ❌ 推理做法 | ✅ 正确做法 |
|------------|-----------|
| "2D 游戏应该用 UI_2D 层" → 写 33554432 | 读 project_1 的 .scene 文件 → 发现是 1073741824 |
| "@property 应该指向节点" → 代码里写节点 `__id__` | 读 project_1 的 .scene 文件 → 发现指向组件 `__id__` |

**规则**：写任何 JSON 模板前，先 `cat` 一个已验证项目的同类文件，提取真实值。

### 3.2 生成后自检

生成 scene/prefab JSON 后，必须跑 `scene-setup` 末尾的自检清单。**不跑自检直接交付 = 未完成**。

### 3.3 复用即审查

复制其他项目的脚本**不是"拿来就用"**，必须做架构审查（见 `new-game` 3.0 步骤）。

### 3.4 每步操作后必须验证

**API 说成功 ≠ 真成功。文件里有 ≠ 编辑器认。验证到能跑为止。**

| 操作 | 验证方式 |
|------|---------|
| attach_script | 读 prefab JSON 检查自定义脚本 `__type__` |
| JSON 绑定 @property | 读回 JSON 检查无 None 值 |
| open_scene 后 | `get_components` 确认编辑器加载了绑定 |

### 3.5 Skill 修改必须回流

修改了 `~/.claude/skills/` 或 `CLAUDE.md` 后，必须同步回 cocosSkill 仓库并 push。否则下个项目还会踩同样的坑。

**回流流程**：
```bash
1. 改 ~/.claude/skills/xxx/SKILL.md 或 ~/.claude/CLAUDE.md
2. cp 到 ~/cocosSkill/
3. cd ~/cocosSkill && git add . && git commit && git push
```

---

## 四、交互规则

- **回复使用中文**
- **UI 设计前先读效果图**，精确还原布局参数
- 迁移/重构组件时，**必须清理旧节点上的旧绑定**（全链路检查）
- **上下文过长主动提醒切换窗口**。判断标准：
  - 已经进行了 5+ 轮复杂改动（涉及多文件编辑）
  - 开始感觉到需要重新读文件来回忆之前做了什么
  - 发现自己漏掉了 skill 调用或 CLAUDE.md 规则
- 切换前写好 `docs/next_session_prompt.md` 供新窗口恢复上下文

---

## 五、开发前检查

每次创建游戏对象或编写功能前，回答这 4 个问题：

```
1. 这个东西的逻辑和视觉分别是什么？→ 分开到不同节点
2. 外观该谁负责？→ 编辑器做 prefab，代码只 instantiate + 控制行为
3. 有没有可复用的部分？→ 提取为独立 prefab
4. 新玩法有没有深度？→ 需要操作层 + 策略层 + 成长层，不是单一机制换皮
```

---

## 六、Skill 索引（按做什么调什么）

| 做什么 | 调什么 skill |
|--------|--------|
| 从策划案+美术做完整游戏 | `new-game` |
| 项目启动前先理解再动手 | `project-kickoff` |
| 设计代码架构 / 分层 | `game-architecture` |
| 实体（Enemy/Player/Bullet）设计 | `entity-lifecycle` |
| 管理器（XxxManager）设计 | `manager-pattern` |
| 3D 引擎做 2D 项目 | `cocos-3d-for-2d` + `scene-setup` |
| UI 还原设计图 | `ui-design` |
| Widget 加不加 / Layer 选哪个 | `cocos-widget-decision` |
| 改 prefab / scene 要走流程 | `cocos-prefab-crud` |
| 手写组件 JSON 查字段 | `cocos-component` |
| 反推 prefab 节点结构 | `prefab-analyze` |
| Cocos 2.x → 3.x 项目复刻 | `cocos-replicate` |
| 代码审查 | `cocos-review` |
| 实现功能前分析链路 | `feature-design` |

---

## 七、快速决策表

| 场景 | 默认做法 |
|------|------|
| 创建可见对象 | `instantiate(prefab)`，不用 `new Node()` |
| 绑定组件 | `@property` > `getComponent` > `addComponent` |
| 需要生命周期 | 继承 Component |
| 纯数据/逻辑 | 普通 class |
| 碰撞识别 | `getComponent(类)`，不用 `group` API |
| MCP / 编辑器不可用 | 提醒用户开启，不绕过 |
| 多模式游戏（闯关/无尽/试玩）| 模式控制器模式（`game-architecture` skill）|

---

## 八、Skills 首次安装

如果当前环境没有 Cocos Creator 相关 skill：

```bash
git clone https://github.com/linyewen/cocosSkill.git ~/cocosSkill
cd ~/cocosSkill && bash install.sh
```

安装后**重新打开 Claude Code 窗口**才能使 skill 生效。
新项目初始化走 `init_project.sh`（详见 README.md）。
