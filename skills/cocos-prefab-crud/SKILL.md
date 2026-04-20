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

## 三条硬红线（违反必回滚）

1. **不用 Python/脚本从零生成 prefab 结构 JSON**。结构（新节点 / 新组件 / 层级变化）一律走编辑器手建。Python 只改已有节点的字段值。
2. **不跳过编辑器肉眼验证**。任何 prefab/scene 改完必须 reimport + 开一次文档，目测 @property 面板无红色 null、SpriteFrame 无白方块，再 commit。
3. **.ts.meta 的 uuid 只能由 Cocos 生成**。若必须预生成（脚本文件新加且 Cocos 未启动），必须在交付说明里明标 ⛔ 需要重启编辑器。

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

**跨项目 starter**：本仓库（cocosSkill）的 `lib/`（TS 运行时基础库）+ `scripts/`（Python 工具）就是 starter 素材。新项目：
```bash
cp cocosSkill/lib/*.ts your-project/assets/Script/infra/
cp cocosSkill/scripts/*.py your-project/scripts/
```

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

**生产级完整工具在本仓库的 `scripts/` 里**（推荐直接用）：
- `scripts/prefab_builder.py` — 完整 PrefabBuilder 类 + `ensure_cocos_closed()` 防呆 + `patch_scene_prefab_ref()` 注入工具
- `scripts/ui_factories.py` — `make_button` / `make_popup_root` / `make_label` / `make_card` / `make_mask` 等高频 UI 模式

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
