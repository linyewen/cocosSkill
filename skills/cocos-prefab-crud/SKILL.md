---
name: cocos-prefab-crud
description: Cocos Creator 3.8.x 的 scene/prefab 增删改查纪律。**只要**你要改 .prefab / .scene / .ts.meta，新增节点或组件，绑 @property，处理 SpriteFrame UUID，或处理编辑器资源刷新问题，就先读这个 skill。核心目的：按"编辑器建结构 + Python 补绑定"的分工避免盲信脚本造成的盲区 Bug。
---

# Cocos Prefab/Scene 增删改查纪律

> **姊妹 skill**：如需深度 prefab JSON 字典（每种组件的具体字段、`__id__` 排列顺序等技术细节），看 `cocos-component`。本 skill 负责**工作流纪律**（什么时候做、谁来做、怎么验证），那个 skill 负责**字段细节**（具体写成什么样）。

## 为什么有这个 skill

Cocos 3.8 的 prefab/scene 是序列化 JSON，看起来可以随手改，但实际上暗坑很多：
- 5 套 ID 系统（uuid / 压缩 uuid / `__id__` / fileId / spriteFrame@frag）混用
- 编辑器有内存缓存，磁盘改了它不一定知道
- 组件的类身份靠 `.ts.meta` 的 uuid，丢一次整个项目炸
- 手写 JSON 容易漏 `__prefab` / `CompPrefabInfo` / `_prefab` 等必填字段

本 skill 把这些知识 + 工作流纪律固化，避免每次临场推导。

---

## 四条硬红线（违反必回滚）

1. **不用 Python/脚本从零生成 prefab 结构 JSON**。结构（新节点 / 新组件 / 层级变化）一律走编辑器手建。Python 只改已有节点的字段值。
2. **不跳过编辑器肉眼验证**。任何 prefab/scene 改完必须 reimport + 开一次文档，目测 @property 面板无红色 null、SpriteFrame 无白方块，再 commit。
3. **.ts.meta 的 uuid 只能由 Cocos 生成**。若必须预生成（脚本文件新加且 Cocos 未启动），必须在交付说明里明标 ⛔ 需要重启编辑器。
4. **所有 Sprite 的 `_spriteFrame` 必须在 prefab/scene 里预先绑定**。绝对不能依赖运行时 `resources.load(...)` 去补图。
   - Sprite 没 spriteFrame 就不渲染（即使颜色不透明、contentSize 正确），直接看起来"消失/黑屏"
   - `resources.load` 是异步 + silent fail，路径写错 / meta 未生成 sprite-frame submeta 时整个场景渲染失败
   - 就算一个 Sprite 会被帧动画刷新（如 Coin/Player），也要绑首帧作为初始图，让动画加载前就能看到占位
   - 自检：`grep -rn '"_spriteFrame": null' assets/**/*.prefab assets/**/*.scene` 为空

---

## MCP 不能信的几个动作（遇到必改走 JSON）

MCP 的 scene/prefab 类 API 有些场景会**静默丢数据**，验证发现结果跟设置不符是常事。已知坑：

| MCP 动作 | 丢什么 | 正确做法 |
|---|---|---|
| `prefab_create_prefab`（转 prefab）| spriteFrame / color / sizeMode / contentSize / 子节点 position 全被重置成默认值 | 转完后必须直接改 .prefab JSON 补回所有视觉字段，再 `reimport_asset` |
| `component_set_component_property` 设 `_spriteFrame` + 随后 `prefab_create_prefab` | spriteFrame 丢 | 同上：只用 MCP 建骨架，视觉字段走 JSON |
| `scene_save_scene`（自定义脚本 @property 绑过 Prefab/Node）| 若编辑器内存中未正确解析压缩 UUID 脚本，会把绑定写成 null 覆盖 JSON | 先 save_scene 让编辑器写出 null 占位，再 Python patch UUID，再 `open_scene`，**不再 save** |

**原则**：MCP 用来**生成节点骨架 + attach 脚本**，任何**引用类字段**（SpriteFrame / Prefab / Node 数组等）必须走 JSON。改完 `reimport_asset` + 关闭重开对应文档（🟡/🔴）。

---

## 刷新矩阵（每次改动必须标档位）

| 档位 | 触发 | 用户操作 |
|:---:|---|---|
| 🟢 | 只改 `.ts` 脚本内容 | 无操作，Ctrl+S 即可 Play |
| 🟡 | 改 `.prefab` JSON 字段值 | **关闭该 prefab 文档 → 重新打开** |
| 🔴 | 改 `.scene` JSON 字段值 | **关闭场景 → 重新打开** |
| ⛔ | 新建 `.ts.meta` 或改其 uuid | **整个编辑器重启**（组件类 hash 已缓存）|

详见 [reference/refresh-matrix.md](reference/refresh-matrix.md)。

---

## 动作模板决策树

遇到 Cocos prefab/scene 任务时，按下表定位到某个模板：

| 你要做的事 | 模板 | 分工 |
|---|---|---|
| 改现有 prefab 的 `@property` 绑定 / Label 文字 / 位置 / 颜色 | [T1](templates/T1-modify-property.md) | Python 主导 |
| 现有 prefab 新加节点或新加组件（结构变化）| [T2](templates/T2-add-node-component.md) | **编辑器主导**，Python 补绑定 |
| 新建一个完整 prefab | [T3](templates/T3-create-prefab.md) | **编辑器建结构**，Python 补脚本/资源引用 |
| 把 prefab 引用注入 scene 的组件字段 | [T4](templates/T4-patch-scene.md) | Python 可主导 |
| **开启全新 Cocos 游戏项目** | [T5](templates/T5-new-project-bootstrap.md) | **用户 cp starter + 编辑器建场景**，Python 补业务 prefab |

**如果任务跨越多个模板**：按依赖顺序分步执行，每步走完验证再下一步。

**跨项目 starter 位置**：`D:\minigame\cocos-game-starter\`（包含 infra/ 运行时基础库 + scripts/ 通用 Python 工具）

---

## 5 套 ID 速查

| 形态 | 长度 | 用在哪 | 示例 |
|---|---|---|---|
| 完整 UUID | 36（带 `-`）| `.meta` 文件、跨文件资源引用 | `9c93288c-0032-4821-875c-f21951dbcde4` |
| 压缩 UUID | 22-23 字符 | prefab/scene 的脚本组件 `__type__` | `9c932iMADJIIYdc8hlR283k` |
| SpriteFrame UUID | `uuid@frag` | Sprite 组件的 `_spriteFrame` | `d25d66e0-...@f9941` |
| 节点 `__id__` | 整数 | 同文件内节点/组件互引 | `{"__id__": 14}` |
| fileId | 22 字符 base64 | PrefabInfo / CompPrefabInfo | `tAFuPepaWokkfdWry4YKka` |

**铁律**：跨文件引用走 `__uuid__`，同文件走 `__id__`。详见 [reference/id-system.md](reference/id-system.md)。

---

## @property 绑定格式速查

```jsonc
// 目标是同文件内的 Node
@property(Node)        → {"__id__": N}

// 目标是同文件内的 Component（如 Button/Label/Sprite/自定义）
@property(Button)      → {"__id__": N}

// 目标是外部 Prefab
@property(Prefab)      → {"__uuid__": "...", "__expectedType__": "cc.Prefab"}

// 目标是外部 SpriteFrame
@property(SpriteFrame) → {"__uuid__": "...@frag", "__expectedType__": "cc.SpriteFrame"}

// 数组
@property([Node])      → [{"__id__": N1}, {"__id__": N2}]

// 空值
@property(Prefab)      → null
```

---

## 通用工具（tools/）

- [uuid_compress.py](tools/uuid_compress.py) — 完整 UUID → 压缩 UUID
- [find_id_by_name.py](tools/find_id_by_name.py) — 在 prefab/scene JSON 里按 `_name` 定位 `__id__`

**生产级完整工具在 starter 里**（推荐直接用）：
- `D:\minigame\cocos-game-starter\scripts\prefab_builder.py` — 完整 PrefabBuilder 类 + `ensure_cocos_closed()` 防呆 + `patch_scene_prefab_ref()` 注入工具
- `D:\minigame\cocos-game-starter\scripts\ui_factories.py` — `make_button` / `make_popup_root` / `make_label` / `make_card` / `make_mask` 等高频 UI 模式

---

## Prefab / Scene 绑定 7 条流程（来自 ProjectDrop 血泪教训）

> 从 CLAUDE.md 10.6 迁入。每一步操作后必须验证结果，不信任 API 返回值。

### A. Prefab 挂脚本：直接编辑 JSON，不用 MCP 实例化→更新回

MCP `attach_script` + `update_prefab` 流程不可靠——脚本可能挂到实例但没回写到 prefab 文件。

```
✗ 错误流程：instantiate prefab → attach_script → update_prefab → 以为成功
✓ 正确流程：直接用 Python 编辑 prefab JSON，添加脚本组件对象 + 更新根节点 _components 引用
```

编辑后必须 `reimport_asset` 让编辑器重新导入。
验证：`get_components` 检查实例化后的节点是否有脚本。

### B. Scene @property 绑定：__id__ 必须动态查找，禁止硬编码

编辑器每次 save_scene 会重新序列化，组件 `__id__` 索引会因新增/删除组件而偏移。

```
✗ 错误：data[55]['scoreLabel'] = {'__id__': 29}   硬编码，下次 save 就错
✓ 正确：find_comp_on_node(find_node_id('ScoreLabel'), 'cc.Label')  按名称+类型动态查找
```

### C. 编辑 JSON 后不能再 save_scene

编辑器内存中自定义脚本的 @property 是 None（编辑器无法解析压缩 UUID 的脚本引用）。save_scene 会用 None 覆盖 JSON 中写入的正确绑定。

```
正确顺序：
1. MCP save_scene（让编辑器先写出最新结构）
2. Python 编辑 JSON（动态查找 __id__ 写入绑定）
3. MCP open_scene（重新加载修改后的文件）
4. 不再 save_scene！提醒用户不要 Ctrl+S
```

### D. 每步操作后必须验证

| 操作 | 验证方式 |
|------|---------|
| attach_script | 读 prefab JSON 检查是否有自定义脚本 __type__ |
| prefab_update | 读 prefab JSON 检查根节点 _components 是否引用脚本 |
| JSON 绑定 @property | 读回 JSON 检查无 None 值 |
| open_scene 后 | get_components 确认编辑器加载了正确的绑定 |

**原则：API 说成功 ≠ 真成功。文件里有 ≠ 编辑器认。验证到能跑为止。**

### E. MCP update_prefab 会丢失 spriteFrame

MCP `set_component_property` 设置 spriteFrame 后，`update_prefab` 会重新序列化 prefab JSON。编辑器序列化时可能把 spriteFrame 覆盖为 null。

```
✗ 错误：MCP set_component_property(spriteFrame) → update_prefab → 以为成功（实际 JSON 里是 null）
✓ 正确：直接用 Python 编辑 prefab JSON 的 _spriteFrame 字段写入 __uuid__ → reimport_asset
```

**静态贴图**（不会运行时变化的）必须直接写入 prefab JSON：
```json
"_spriteFrame": {
    "__uuid__": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@f9941",
    "__expectedType__": "cc.SpriteFrame"
}
```
**动态贴图**（运行时根据状态变化）用 resources.load()，如结算页的胜利/失败图标。

### F. 全屏页面 Prefab 必须设 Widget _alignFlags=45

全屏页面（引导、结算、弹窗）的根节点 Widget `_alignFlags` 必须设为 45（上下左右四边=0）。Python 编辑 JSON 时同步设置 `_left/_right/_top/_bottom` 为 0。

> 详细 Widget 决策见 `cocos-widget-decision` skill。

### G. 导入图片后检查 meta sprite-frame submeta

导入图片资源后，必须检查 `.meta` 文件的 `subMetas` 是否包含 `sprite-frame` importer：
```json
"subMetas": {
    "f9941": {
        "importer": "sprite-frame",   必须有这个
        "name": "spriteFrame",
        ...
    }
}
```
缺少 sprite-frame submeta 会导致 Sprite 组件显示全黑。修复：在编辑器中右键资源 → Reimport，或手动添加 submeta。

---

## 与用户的交付协议

每次我做完 Cocos 相关改动，**在 commit 消息或对话回复里明标**：

```
【刷新档位】🟡 / 🔴 / ⛔（按表最高档取）
【用户操作】具体几步（重开文档 / 重启编辑器 / Reimport）
【验收清单】3 条 —— 1. 视觉对不对 2. @property 面板无红 null 3. SpriteFrame 有图
```

用户完成验收并反馈 OK 之前，**不启动下一段工作**。

---

## 红线违规自查

如果任何一步触发以下情况，**立刻停手并回滚**：

- 我用 Python 新建了 prefab 的根节点 / 层级结构
- 我改了 `.prefab` 或 `.scene` 但没要求用户重开文档
- 我新加了 `.ts.meta` 但没要求用户重启编辑器
- 我 commit 前没让用户在编辑器里肉眼验证

违规回滚：`git revert <sha>`，然后按正确模板重做。
