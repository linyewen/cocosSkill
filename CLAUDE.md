# AI × Cocos Creator 开发铁律

常驻加载。违反必回滚。具体操作流程、组件字段、反例代码见对应 skill。

---

## 一、核心哲学（三条分离）

1. **逻辑 / 视觉分离**：逻辑组件（脚本/碰撞）挂根节点，视觉组件（Sprite/Label）挂 `icon` 子节点。
2. **外观 / 行为分离**：编辑器做 prefab，代码只 `instantiate + getComponent().setData()`。
3. **View / Item 分离**：页面管布局和生命周期，子元素必须提供 `setData()` 方法。

---

## 二、硬红线（违反必回滚）

1. **Prefab 必须绑定代码**：每个可复用实体自带脚本封装行为。主脚本不得在外部操作 prefab 内部的 tween / 动画 / 位置。
2. **禁止代码拼 UI**：不用 `new Node() + addComponent` 造可见对象。MCP 没开 → 提醒开，不绕过。例外：纯逻辑容器、一次性几何绘制。
3. **@property 不做 fallback**：不判空、不用 `getChildByName` 兜底、不做默认值。运行时缺失就报错暴露问题。
4. **@property 声明和绑定是原子操作**：写完脚本后立刻用 Python 编辑 prefab/scene JSON 绑 `__id__`，不能留到后面。
5. **Sub-agent 委托必须携带规则**：agent 看不到 CLAUDE.md，prompt 里要写死适配策略、逻辑/视觉分离原则、关键属性值。完成后必须验证 `_alignFlags / _contentSize / position`。
6. **编辑器打开时禁止直接写 scene/prefab JSON**：正确闭环 `save_scene → Python 编辑 → open_scene → 不再 save_scene`（open 后 save 会用内存 null 覆盖绑定）。详见 `cocos-prefab-crud`。
7. **碰撞识别用 `getComponent(类)`**，不用 `collider.group / getGroup()` API。

---

## 三、物理常数（AI 必猜错的值）

- UI 层 `_layer = 1073741824`（不是 33554432）
- Camera 必须是 Canvas 子节点，`z = 1000`，`_projection = 0`（正交）
- Widget `_alignFlags = 45` 是全屏拉伸最常用值
- `@property(Component 类型)` 绑的是**组件** `__id__`，不是节点 `__id__`
- SpriteFrame UUID 带 `@f9941` 子资源后缀；Prefab / AudioClip UUID 不带

---

## 四、工作态度

1. **验证优先**：每个技术值必须读已验证项目的同类文件确认，不靠推理。写任何 JSON 模板前先 `cat` 一份真的。
2. **每步操作后验证**：API 成功 ≠ 真成功，文件里有 ≠ 编辑器认。attach_script / JSON 绑定 / open_scene 后都要读回校验。
3. **生成后自检**：scene/prefab JSON 生成后必跑 `scene-setup` 末尾的自检清单，不跑自检 = 未完成。
4. **复用即审查**：复制其他项目的脚本必须做架构审查（见 `new-game` Phase 3）。
5. **修改 skill / CLAUDE.md 必须回流 cocosSkill 仓库**（流程见仓库 README）。

---

## 五、交互规则

- 回复使用中文
- UI 设计前先读效果图，精确还原布局
- 迁移/重构组件时必须清理旧节点上的旧绑定（全链路检查）
- 上下文过长（5+ 轮复杂改动 / 需要重读文件回忆上下文 / 漏调 skill）主动提醒切换窗口，切换前写 `docs/next_session_prompt.md`

---

## 六、开始做任何可见对象前，回答 3 问

1. 逻辑和视觉分别挂哪个节点？
2. 外观由编辑器做 prefab，代码只负责 `instantiate` + 控制？
3. 有没有可提成独立 prefab 的部分？

---

## 七、Skill 索引

| 做什么 | 用哪个 skill |
|--------|--------|
| 从策划案 + 美术做完整游戏 | `new-game` |
| 项目启动前先理解再动手 | `project-kickoff` |
| 设计代码架构 / 分层 | `game-architecture` |
| 实体（Enemy/Player/Bullet）设计 | `entity-lifecycle` |
| 管理器（XxxManager）设计 | `manager-pattern` |
| 3D 引擎做 2D | `cocos-3d-for-2d` + `scene-setup` |
| UI 还原设计图 | `ui-design` |
| Widget 加不加 / Layer 选哪个 | `cocos-widget-decision` |
| 改 prefab / scene 要走流程 | `cocos-prefab-crud` |
| 手写组件 JSON 查字段 | `cocos-component` |
| 从代码反推 prefab 节点结构 | `prefab-analyze` |
| Cocos 2.x → 3.x 复刻 | `cocos-replicate` |
| 代码审查 | `cocos-review` |
| 实现功能前分析链路 | `feature-design` |

---

## 八、快速决策表

| 场景 | 默认做法 |
|------|------|
| 创建可见对象 | `instantiate(prefab)`，不用 `new Node()` |
| 绑定组件 | `@property` > `getComponent` > `addComponent` |
| 需要生命周期 | 继承 `Component` |
| 纯数据 / 逻辑 | 普通 class |
| 碰撞识别 | `getComponent(类)` |
| MCP / 编辑器不可用 | 提醒用户开启，不绕过 |
| 多模式游戏（闯关/无尽/试玩）| 模式控制器模式（`game-architecture`）|
