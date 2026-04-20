# 编辑器刷新矩阵

Cocos Creator 3.8 启动后维护一张**内存索引表**（uuid → asset、组件类 hash → TypeScript class）。磁盘改动什么时候被这张表感知，取决于改的是啥、改之前编辑器是否打开着该资源。

---

## 四档表

| 档位 | 触发 | 后果（不操作的话）| 用户应做 |
|:---:|---|---|---|
| 🟢 | 只改 `.ts` 脚本内容（不新增 @property） | 无 —— 保存后自动编译，Play 即新版本 | 无操作 |
| 🟡 | 改已有 `.prefab` 的字段值（@property 绑定、Label、位置、颜色、SpriteFrame uuid 等）| 如果该 prefab 文档打开着，编辑器内存是旧的，保存会**覆盖** Python 的磁盘改动 | **关闭该 prefab 文档 → 重新打开** |
| 🔴 | 改 `.scene` 的字段值 | 同 🟡，覆盖风险更高（场景通常一直开着）| **关闭 scene → 重新打开**（或整个切场景再切回）|
| ⛔ | **新建** `.ts` + `.ts.meta`；**或给已有 `.ts` 加新 `@property` 后 Python 往 prefab/scene 写该字段的 ref** | 前者组件类 hash 表未更新，Play 报"未知组件"；后者 Cocos 打开场景时会"清理"新字段变 null，提示保存→保存=丢绑定 | **整个编辑器重启**（确保 TS 编译完成后**再启动 Python**），见 [新 @property 协调流程](#新-property-协调流程) |

---

## 为什么有 🟡 和 🔴 的区别

Cocos 对**当前在编辑器打开的文档**有"脏检查"锁：文档在编辑器内存里是"权威版本"，保存时会覆盖磁盘；即使磁盘有新内容，编辑器也不会自动 merge。

- prefab 文档：通常是打开一会儿就关了，影响面小 → 🟡
- scene 文档：通常是整个开发周期都开着，影响面大 → 🔴

两者补救是一样的（关文档重开），分档是为了**风险等级**明确，用户知道哪个更容易踩坑。

---

## 为什么 ⛔ 必须重启

`.ts.meta` 的 uuid 决定：
- 该脚本被其他 prefab/scene 引用时的**压缩类型字符串**
- 编辑器 @property 面板拉下拉框时显示的**组件类列表**

这张"组件类身份证表"只在 Cocos 启动时扫一次。热更机制不稳定，靠 File Watcher 自动刷新经常漏。重启是最稳的。

**实操经验**：
- 新 `.ts` + 没有 `.ts.meta` → 用户启动/重启编辑器 → Cocos 自动生成 meta + 注册类
- 新 `.ts` + Claude 预生成了 `.ts.meta`（用 Python） → 仍然需要重启编辑器让 Cocos "发现"这个脚本类

---

## 新 @property 协调流程

**踩坑场景（2026-04-19 ProjectDrop）**：
- Claude 给已有 GameEntry.ts 加了 3 个新 `@property(Prefab)` 字段
- Python 往 scene 文件写了这 3 个字段的 UUID ref
- 用户打开 Cocos 时 TS 可能还没编译完，GameEntry 类表里没这 3 个字段
- Cocos 加载 scene 发现"该组件没声明这些字段"→ **自动 null 掉 + 标记场景为 dirty**
- 弹出"保存场景？"提示 → 用户保存 → 3 个 null 字段写回磁盘 → **绑定全丢**

**正确流程（顺序不能错）**：
1. Claude 改 TS 加 `@property` 字段
2. **用户先单独启动 Cocos 一次**，等 TS 编译完成（看控制台 `[INFO] TypeScript compile succeed`）
3. 完全关闭 Cocos
4. Claude 跑 Python 补 scene/prefab 的绑定
5. 用户再次启动 Cocos → TS 已注册 + scene 从磁盘读到新 ref → 绑定有值

**如果顺序搞反了，保存弹窗出现怎么办**：
- **点"取消"不要保存**（保存 = 覆盖磁盘成 null）
- 关 Cocos → 按上面 1-5 重走一遍 → scene 磁盘仍是 Python 写的好状态

---

## 不算刷新的"补救"手段

### Reimport

右键资源 → Reimport。**只适用于资源类**（贴图、音效、prefab 文件），对 `.ts.meta` 无效。

### Refresh

`Ctrl + F5` / 菜单里的 Refresh。**只刷新 asset 数据库**，不刷新组件类注册表。

### 关闭编辑器再开

比重启强，但如果编辑器有崩溃或持久化缓存坏了，不如点菜单 `Developer → Clear Cache`。

### 删 `.creator/` 缓存

用户级最后手段。Cocos 会重新扫整个项目，慢但干净。**git 忽略 `.creator/`**。

---

## 速查：我做了什么 → 用户应做什么

| 我做了 | 档位 | 用户操作 |
|---|:---:|---|
| Edit / Write `.ts` 内容 | 🟢 | 无 |
| Write 新 `.ts`（无 meta）| ⛔ | 重启编辑器 |
| Write 新 `.ts` + Python 预生成 `.ts.meta` | ⛔ | 重启编辑器 |
| 改 `.prefab` 的 `_lpos` / `_string` / `_color` | 🟡 | 关该 prefab 文档重开 |
| 改 `.prefab` 的 `__uuid__`（换 SpriteFrame）| 🟡 | 关该 prefab 文档重开 |
| Python 写全新 `.prefab` 文件（违规，别做）| 🟡 | 关该 prefab 文档重开 |
| 改 `.scene` 的组件字段 | 🔴 | 关 scene 重开 |
| 改 `.prefab.meta` 的 uuid | 🟡 | 关 prefab 重开 + 被引用方重开 |
| 删资源文件（`.ts` / `.prefab` / `.png`）| 🟡 | Reimport 或重启 |

**复合操作取最高档**：比如同时改了 `.ts.meta` 和 `.prefab`，就是 ⛔，不是 🟡。

---

## 用户 OP 清单模板

我在交付每次改动时，按下面格式报告：

```
【刷新档位】🟡
【用户操作】
  1. 编辑器里关掉 MainMenuPrefab 文档（若开着）
  2. 重新打开 MainMenuPrefab
  3. 看根节点脚本组件 @property 面板
【预期现象】
  - levelBtn / endlessBtn / playableBtn / infoLabel 四个字段都有值
  - 不是红色 "null"
【如果异常】
  - 红 null → 告诉我哪个字段，我检查 Python 绑定
  - 视觉错位 → 截图发 d:\错误图\
```
