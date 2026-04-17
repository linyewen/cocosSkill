# Cocos 3.8 的 5 套 ID 系统

Cocos 的序列化格式用了 5 种不同的 ID 来表达不同粒度的引用。搞混任何两种都会引发诡异 bug。

---

## 1. 完整 UUID（36 字符）

**格式**：`9c93288c-0032-4821-875c-f21951dbcde4`

**存在哪**：`.meta` 文件（每个资源文件旁边都有一个 `.meta`）

**谁生成**：Cocos 编辑器启动时扫新资源时生成（从随机 128 bit + 时间戳哈希）

**用途**：**资源的全局身份证**。整个项目唯一。

```json
// MainMenuController.ts.meta
{
  "uuid": "9c93288c-0032-4821-875c-f21951dbcde4",
  "importer": "typescript",
  ...
}
```

**铁律**：
- 一个资源的 uuid 一旦分配**永不改变**（除非手动改 meta 或删重建）
- 删 `.meta` 等于删掉这个资源的身份，所有指向它的引用都会 null

---

## 2. 压缩 UUID（22-23 字符）

**格式**：`9c932iMADJIIYdc8hlR283k`

**存在哪**：prefab/scene 里的**脚本组件 `__type__`** 字段

**谁生成**：Cocos 编辑器序列化时，对脚本的 uuid 执行压缩算法

**算法**：
```python
def compress_uuid(uuid):
    u = uuid.replace('-', '')
    prefix = u[:5]           # 前 5 hex 原样保留
    rest = u[5:]              # 剩下 27 hex，每 3 hex → 2 base64 char
    BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    result = prefix
    for i in range(0, len(rest), 3):
        chunk = int(rest[i:i+3], 16)
        result += BASE64[(chunk >> 6) & 63]
        result += BASE64[chunk & 63]
    return result
```

**用途**：prefab/scene JSON 里需要标识一个脚本组件类型，用压缩 uuid 节省空间。

```json
{
  "__type__": "9c932iMADJIIYdc8hlR283k",   // MainMenuController 脚本类
  "node": {"__id__": 1},
  "_enabled": true,
  "levelBtn": {"__id__": 11}
}
```

**工具**：`tools/uuid_compress.py`

---

## 3. SpriteFrame UUID（uuid@frag）

**格式**：`d25d66e0-5026-4cfe-a925-6f6af4294bbe@f9941`（UUID + `@` + 4 字符 frag）

**存在哪**：Sprite 组件的 `_spriteFrame` 字段

**为什么有 @frag**：一张 `.png` 可能包含多个 SpriteFrame（九宫格切片、图集）。`@frag` 标识具体哪个 SpriteFrame。单图资源通常是 `@f9941`（Cocos 的默认 frag）。

**怎么查**：读 `.png.meta`，里面有 `subMetas.{frag}.uuid`（完整 SpriteFrame uuid）。或看现有 prefab 里引用的格式抄。

```json
// png 的 meta 里
{
  "uuid": "d25d66e0-5026-4cfe-a925-6f6af4294bbe",   // 纹理本体
  "subMetas": {
    "f9941": {
      "uuid": "d25d66e0-5026-4cfe-a925-6f6af4294bbe@f9941",  // SpriteFrame
      "importer": "sprite-frame"
    }
  }
}
```

**用途**：Sprite 组件引用图片时用的**完整引用**。

```json
"_spriteFrame": {
  "__uuid__": "d25d66e0-5026-4cfe-a925-6f6af4294bbe@f9941",
  "__expectedType__": "cc.SpriteFrame"
}
```

**坑**：忘了 `@frag` 会变白方块。

---

## 4. 节点 `__id__`（整数）

**格式**：整数，从 0 开始

**存在哪**：prefab/scene JSON 文件内部的节点互引

**谁生成**：Cocos 序列化时按 JSON 数组顺序编号。根节点（Prefab asset）是 0，第一个 Node 是 1，其下每个 Component 和子 Node 依次 2、3、4...

**用途**：**同文件内**指向另一个对象（Node / Component）。

```json
// prefab 里某脚本组件的 @property 指向另一个节点
{
  "__type__": "...",
  "levelBtn": {"__id__": 11}   // 11 是同文件内 Button 组件的索引
}
```

**铁律**：
- `__id__` **只在本文件内有效**，不能跨文件引用
- 文件被编辑器重排时 `__id__` 可能变化（用户加减节点后），**不能缓存用跨次**

---

## 5. fileId（22 字符 base64）

**格式**：`tAFuPepaWokkfdWry4YKka`

**存在哪**：`cc.PrefabInfo` 和 `cc.CompPrefabInfo`

**谁生成**：Cocos 创建节点/组件时分配，整个项目唯一

**用途**：**prefab 嵌套或实例化时的身份追踪**。当 prefab A 被实例化到 prefab B 里，B 里的每个子节点需要"我是 A 哪个节点的实例"这种身份，fileId 就是。

```json
// 每个 Node 的 _prefab 指向一个 cc.PrefabInfo
{
  "__type__": "cc.PrefabInfo",
  "root": {"__id__": 1},
  "asset": {"__id__": 0},
  "fileId": "tAFuPepaWokkfdWry4YKka",
  "instance": null
}

// 每个 Component 的 __prefab 指向一个 cc.CompPrefabInfo
{
  "__type__": "cc.CompPrefabInfo",
  "fileId": "toCDLexIJsBTQDHCv+C/Og"
}
```

**铁律**：
- 绝不手工编的同的 fileId（必须随机生成）
- 新加节点/组件时都需要新 fileId；手写容易漏配对

---

## 引用规则对照表

| 场景 | 用哪种 ID |
|---|---|
| Scene 挂 Prefab 实例 | `__uuid__` 完整 UUID |
| Scene 挂脚本类型 | `__type__` 压缩 UUID |
| Prefab 内部节点互引 | `__id__` |
| Prefab 内部组件指向同节点的其他组件 | `__id__` |
| Prefab 内部组件指向外部资源（SpriteFrame/AudioClip/Prefab）| `__uuid__`（SpriteFrame 要 `@frag`）|
| Node 的 _prefab / Component 的 __prefab | `__id__`（指向 PrefabInfo / CompPrefabInfo，这俩才用 fileId）|

---

## 调试脚本

如果某个引用疑似坏了，用这个 Python 可以列出 prefab 的所有引用关系：

```python
import json
with open('assets/prefabs/MainMenuPrefab.prefab', encoding='utf-8') as f:
    data = json.load(f)

for i, obj in enumerate(data):
    if not isinstance(obj, dict):
        continue
    t = obj.get('__type__', '')
    name = obj.get('_name', '')
    print(f'[{i}] {t} name={name}')
    # 列出所有 __id__ 和 __uuid__ 引用
    for k, v in obj.items():
        if isinstance(v, dict):
            if '__id__' in v:
                print(f'   .{k} → __id__ {v["__id__"]}')
            elif '__uuid__' in v:
                print(f'   .{k} → __uuid__ {v["__uuid__"][:16]}...')
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            refs = [r.get('__id__') or r.get('__uuid__', '')[:10] for r in v]
            print(f'   .{k}[] → {refs}')
```
