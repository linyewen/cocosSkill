---
name: cocos-replicate
description: Cocos Creator 2.x → 3.x 项目完整复刻方法论。从一个下午的反复失败中总结出的工具链、流程和避坑指南。
user-invocable: true
allowed-tools: Read, Grep, Glob, Agent, Bash
argument-hint: "[原版项目路径] [目标项目路径]"
---

# Cocos 2.x → 3.x 完整复刻指南

从实战中总结——一个下午的反复失败教会的所有教训。

## 核心原则

1. **从原版数据复制，不凭记忆拼装** — 原版 JSON 有什么属性就复制什么，不手动猜值
2. **UUID 和绑定是两码事** — UUID 是寻址机制（可以重新生成），绑定是逻辑关系（属性名→目标节点名）
3. **多删少补，以原版为准** — 3.x 比原版多的节点/组件→删。少的→补。不做主观判断
4. **每次修改后全量重检** — 一次修改可能破坏其他绑定，必须重跑对比工具
5. **工具驱动，不靠人工** — 手动检查必有盲区，程序遍历没有

---

## 第一步：构建对比工具（scene-diff）

**在动手修改之前，先写对比工具。没有工具就没有标准。**

工具要求：
- 从 **Scene 根节点**开始扫描（不只 Canvas，还有 Scene 级节点如 Animation、shader）
- 递归对比每个节点的：名称、active 状态、子节点列表
- 对比每个节点上的组件列表（检测缺失和多余）
- 对比组件属性值（不只检查"有没有"，还检查"值对不对"）
- 区分引擎差异（Camera 合并、BgLayer 瓦片系统等）和复刻差异
- 输出可执行的差异清单

```
差异类型：
❌ 缺失节点 → 从原版提取并插入
➕ 多余节点 → 删除
⚠️ 缺失组件 → 添加
📎 多余组件 → 删除
🔄 改名 → 恢复原名
```

---

## 第二步：场景结构复刻

### 2.1 节点树复刻

从原版 .fire 文件提取完整节点树，对照创建。每个节点必须检查：
- [ ] 名称完全一致（包括大小写：PlaneLayer 不是 planeLayer）
- [ ] 父子关系一致（Node_Map 在 BgLayer 下，不在 Canvas 下）
- [ ] 子节点数量一致（不能少也不能多）
- [ ] 渲染顺序一致（siblingIndex）
- [ ] active 状态一致
- [ ] 所有属性（position、scale、contentSize、anchorPoint、opacity）从原版复制

### 2.2 组件复刻

每个节点上的每个组件，逐属性复制：
- Sprite：sizeMode、type、fillType、spriteFrame（UUID 需要映射）
- Widget：alignFlags、left/right/top/bottom、alignMode
- Label：string、fontSize、lineHeight、alignment、overflow、color
- Button：transition、normalColor、pressedColor
- Layout：layoutType、resizeMode、spacing、padding
- 自定义脚本：所有 @property 值

**不要手动创建组件然后猜属性值。从原版 JSON 读取完整数据，只做必要的格式转换。**

### 2.3 不要遗漏的节点

- Scene 根级节点（不在 Canvas 下的：Animation、shader 等）
- UiLayer 内部的子节点（touch、BloodLayer 等）
- 深层嵌套的子节点（PathMgr 路径控制点的 p1/c1/c2/p2、GuidePrefab 的路径点）
- 每个 Button 内的 Background 子节点

---

## 第三步：UUID 映射

### 3.1 资源 UUID

2.x 和 3.x 的同一个文件有不同的 UUID。建立映射表：

```
扫描两个项目的 assets/ 目录 → 按文件相对路径匹配 → 2.x UUID → 3.x UUID
```

包括子资源映射（SpriteFrame 的 `@f9941` 后缀）。

### 3.2 脚本 UUID

脚本文件的 UUID 也不同。通过文件名匹配：

```
2.x: scripts/SettlementUi.ts → UUID: 10de1...
3.x: Script/ui/SettlementUi.ts → UUID: e5862...
```

用 `cc-uuid.js` 工具获取压缩 UUID，建立映射表。

### 3.3 替换所有引用

场景 JSON 中所有 `__uuid__` 值用映射表替换。
场景 JSON 中所有 `__type__`（自定义脚本类型）用脚本 UUID 映射表替换。

---

## 第四步：@property 绑定（最容易出错的环节）

### 4.1 核心方法：ID 映射表自动翻译（推荐）

**不要清空 `__id__` 然后手动逐个重绑——手动永远不完整。**

正确做法：在构建 3.x 节点时，同步建立 **2.x ID → 3.x ID** 的映射表，然后用映射表自动翻译组件中的所有 `__id__` 引用。

```javascript
// 构建映射表
const idMap = new Map();
// 在创建每个节点时记录：2.x 中 id=3(shadow) → 3.x 中 id=7(shadow)
idMap.set(3, 7);
idMap.set(5, 12);  // icon
// ...每个节点和组件都记录

// 翻译组件中的所有引用
function translateIds(obj) {
    if (obj?.__id__ !== undefined) {
        obj.__id__ = idMap.get(obj.__id__) ?? obj.__id__;
    }
    if (Array.isArray(obj)) obj.forEach(translateIds);
    if (typeof obj === 'object' && obj !== null) {
        for (const v of Object.values(obj)) translateIds(v);
    }
}
// 对每个组件执行翻译 → 所有 @property 绑定自动正确
```

**ID 翻译的排除字段（关键！）：**

以下字段是 3.x 构建时设置的，**不能**被 2.x ID 映射翻译：
```javascript
const EXCLUDE = ['node', '__prefab', '__editorExtras__'];
// node → 组件所属的 3.x Node（构建时设置）
// __prefab → 指向 CompPrefabInfo（3.x 新增，2.x 没有）
// 翻译这些字段会导致：组件指向错误节点、prefab 无法打开
```

**重建 prefab 后的必要验证：**
```
- [ ] 所有组件的 node 指向 cc.Node 类型（不是脚本或 UITransform）
- [ ] 所有组件的 __prefab 指向 cc.CompPrefabInfo
- [ ] 所有节点的 _prefab 指向 cc.PrefabInfo
- [ ] 无效 UUID 已清理（2.x UUID 不存在于 3.x 的设为 null）
- [ ] 引用完整性 0 断裂
```

**为什么不能用"手动逐个重绑"：**
- 手动需要知道每个属性绑定到哪个节点 → 依赖记忆 → 必有遗漏
- 清空后手动补 = 把已知信息丢掉再猜回来 → 本末倒置
- 自动翻译 = 保留所有信息，只换寻址方式 → 零遗漏

### 4.2 备选方法：逻辑关系绑定（仅用于跨文件引用）

ID 映射表只能处理**同文件内**的引用。对于**跨文件引用**（如 scene 引用 prefab 中的组件），需要用逻辑关系：

1. 从原版读出逻辑关系："SettlementUi.winNode 绑定到名叫 winNode 的子节点"
2. 在 3.x 场景中按名字查找 winNode 节点
3. 获取 3.x 中该节点的 ID
4. 写入绑定

属性类型决定绑定目标：
```
@property(Node) winNode     → 绑定到节点 ID
@property(Sprite) playBar   → 绑定到节点上 Sprite 组件的 ID
@property(Button) playAgainBtn → 绑定到节点上 Button 组件的 ID
```

### 4.3 同名节点陷阱

场景中可能有多个同名节点（如多个 "New Button"）。必须通过 **parent._children** 确认节点在活跃树中，不能用全局搜索。

```javascript
// ❌ 错误：可能找到孤立的旧节点
findNode('New Button')

// ✅ 正确：确认在活跃父节点的 children 中
const parent = scene[parentId];
const btn = parent._children.find(c => scene[c.__id__]._name === 'New Button');
```

---

## 第五步：Button 事件绑定

### 5.1 3.x ClickEvent 格式

3.x 的 Button 事件必须包含 `_componentId`（脚本压缩 UUID），否则编辑器只能看到目标节点但找不到组件和方法。

```json
{
    "__type__": "cc.ClickEvent",
    "target": { "__id__": 339 },
    "component": "SettlementUi",
    "_componentId": "e58620d1ddFooF+/DxSjaWv",
    "handler": "onClickWin",
    "customEventData": ""
}
```

`component` = @ccclass 装饰器中的类名字符串
`_componentId` = 该脚本 .ts.meta 的压缩 UUID
`handler` = 方法名

**缺少 `_componentId` 会导致编辑器中组件和方法显示为空。**

### 5.2 从原版提取事件逻辑关系

```
原版：winNode/New Button 的 ClickEvent target=SettleUi handler=onClickWin
→ 3.x：找到活跃树中 winNode 下的 New Button → 找 Button 组件 → 创建 ClickEvent
```

---

## 第六步：引擎差异处理

### 6.1 坐标系统

- 2.x：世界坐标原点在屏幕中心
- 3.x：Canvas 强制在 (w/2, h/2)，`convertToWorldSpaceAR` 返回的坐标有偏移
- **解决方案**：所有坐标计算用本地坐标（`node.position`），不用 `worldPosition`

### 6.2 物理系统

- 2.x：内置碰撞系统（cc.BoxCollider，不需要 RigidBody，回调中可自由操作节点）
- 3.x：没有独立碰撞系统，必须用 2D 物理（`physics-2d-builtin`）
- `BoxCollider` → `BoxCollider2D`，`RigidBody` → `RigidBody2D`
- 碰撞回调中不能直接 destroy/removeFromParent → 用 `scheduleOnce(cb, 0)` 延迟
- 碰撞分组通过 `RigidBody2D.group` 设置（运行时 API）

### 6.3 资源加载

- 3.x 中 `resources.load(path, SpriteFrame)` 可能失败
- png 文件的 SpriteFrame 是子资源，路径可能需要 `/spriteFrame` 后缀
- 用兜底函数 `loadSpriteFrame(path, cb)` 统一处理

### 6.4 Camera

- 2.x：双相机（Main Camera + uicamera）
- 3.x：单相机，这是引擎差异不需要复刻

### 6.5 对象池

- 3.x 的 `NodePool.put()` 不会 removeFromParent
- 被回收的节点物理体可能仍在物理世界中
- `safePoolPut(pool, node)` = 先 removeFromParent 再 put
- `safePoolGet(pool)` = 跳过已销毁的无效节点

---

## 第七步：自测验证

### 7.1 必须检查的项目

- [ ] 所有 `__id__` 引用有效（没有指向 null/undefined）
- [ ] 所有脚本 @property 绑定到正确的节点/组件
- [ ] 所有 Button 事件有 target + component + _componentId + handler
- [ ] 所有材质引用有效（UUID 已映射）
- [ ] Canvas 上没有多余的脚本组件
- [ ] 节点树结构和原版一致（diff=0）
- [ ] 不在编辑器打开场景时修改文件

### 7.2 验证方法

```
修改 → 跑 diff 工具 → 有差异 → 修复 → 跑 diff → 直到 0
      → 跑绑定检查 → 有问题 → 修复 → 跑检查 → 直到 0
      → 打印两边完整节点树 → 逐行对比 → 一致才算完成
```

### 7.3 修复工具不能引入新问题

- 不硬编码节点 ID（ID 会变，必须动态查找）
- 修复前检查是否已存在（避免重复添加组件）
- 修复后立即验证（不是明天验证）

---

## Prefab 文件格式（与 Scene 不同！）

**Scene 和 Prefab 是不同的文件格式，不能用同一种方式编辑。**

### Scene vs Prefab 区别

| 维度 | Scene 文件 | Prefab 文件 |
|------|-----------|------------|
| 节点的 `_prefab` | 无 | **每个节点必须有** → PrefabInfo |
| 组件的 `__prefab` | 无 | **每个组件必须有** → CompPrefabInfo |
| `_parent` 根节点 | `__id__` 指向 Scene | `null`（prefab 根没有父节点） |
| 数组截断 | 风险中等 | **直接破坏文件，编辑器无法加载** |

### Prefab 标准结构

```json
[0] cc.Prefab { data: { __id__: 1 } }
[1] cc.Node (根节点) {
      _prefab: { __id__: N },  // → PrefabInfo
      _components: [
        { __id__: 2 },  // UITransform
        { __id__: 4 },  // 脚本组件
      ]
    }
[2] cc.UITransform { __prefab: { __id__: 3 } }
[3] cc.CompPrefabInfo { fileId: "ut0" }
[4] 脚本组件 { __prefab: { __id__: 5 } }
[5] cc.CompPrefabInfo { fileId: "cp0" }
[N] cc.PrefabInfo { root: { __id__: 1 }, asset: { __id__: 0 }, fileId: "rootNode" }
```

### Prefab 修改规则

1. **永远不截断数组** — `array.length = x` 会破坏 PrefabInfo 链，导致 "Open prefab failed"
2. **每个新节点必须有 PrefabInfo** — `_prefab: { __id__: x }` 指向 `cc.PrefabInfo` 条目
3. **每个新组件必须有 CompPrefabInfo** — `__prefab: { __id__: x }` 指向 `cc.CompPrefabInfo` 条目
4. **fileId 必须唯一** — 每个 PrefabInfo/CompPrefabInfo 的 fileId 不能重复
5. **根节点的 PrefabInfo** 需要 `root: { __id__: 1 }` 和 `asset: { __id__: 0 }`
6. **子节点的 PrefabInfo** 只需要 `root: { __id__: 1 }` 和 `fileId`
7. **修改 prefab 不影响引用它的 scene** — scene 通过 UUID 引用 prefab 资源，不关心内部结构

### 不同文件类型的经验不能套用

之前编辑 scene 文件学到的技巧（如截断重建），不能直接用到 prefab 上。
**修改任何文件格式之前，先研究该格式的必需结构。**

---

## 工具清单

| 工具 | 用途 |
|------|------|
| `scene-diff.js` | 两个场景的结构级对比 |
| `smart-bind.js` | 从原版提取逻辑关系，在 3.x 中按名字绑定 |
| `full-replicate.js` | 完整的属性级复刻 |
| `deep-replicate.js` | 深度复刻（含组件同步） |
| `verify-and-fix.js` | 综合验证+自动修复 |
| `cc-uuid.js` | UUID 压缩/解压 |
| `loadSpriteFrame` | SpriteFrame 加载兼容工具 |
| `safePoolGet/Put` | 对象池安全操作 |

---

## 常见陷阱速查

| 陷阱 | 表现 | 解决 |
|------|------|------|
| 复制 2.x `__id__` | 绑定指向错误节点 | 构建 ID 映射表自动翻译（不要手动逐个重绑） |
| 清空 `__id__` 再手动补 | 永远补不全，总有属性遗漏 | 不清空，用映射表翻译 |
| ClickEvent 缺 `_componentId` | 编辑器中组件和方法为空 | 添加脚本压缩 UUID |
| 同名节点 | 绑定到孤立旧节点 | 通过 parent._children 确认在活跃树中 |
| Canvas 在 (w/2,h/2) | 边界检查提前销毁子弹 | 用本地坐标计算 |
| 3D 物理做 2D 游戏 | 碰撞不准、位置不同步 | 用 `physics-2d-builtin` |
| `NodePool.put` 不移除节点 | 已回收节点继续碰撞 | 用 `safePoolPut` |
| `resources.load` SpriteFrame 失败 | 图片加载不出来 | 兜底追加 `/spriteFrame` |
| 修复脚本硬编码 ID | 节点移动后 ID 变了，脚本失效 | 动态查找 |
| 编辑器打开时修改文件 | 保存时被覆盖 | 关闭编辑器再修改 |
| diff 工具只检查 Canvas | 遗漏 Scene 级节点 | 从 Scene 根开始扫描 |
| ID翻译了 `node`/`__prefab` 字段 | 组件指向错误节点、prefab 崩溃 | translateObj 排除 node/__prefab/__editorExtras__ |
| 截断 prefab 数组 | "Open prefab failed" | 永远不截断，只增不删 |
| prefab 节点缺 PrefabInfo | 编辑器无法解析 | 每个节点/组件都要有对应的 PrefabInfo/CompPrefabInfo |
| scene 编辑经验套用到 prefab | 格式不同导致文件损坏 | 不同文件类型先研究格式再修改 |
