# T4: 把 prefab 引用 / 资源引用注入 scene 的组件字段

**适用场景**：scene 里某个节点挂了脚本（如 GameEntry），要给它的 `@property(Prefab)` 字段绑上 prefab UUID。

**分工**：Python 主导。

**刷新档位**：🔴（改 scene JSON → 关闭场景重开）

---

## 为什么 Python 能做

Scene 的节点结构一般不用动（我们只改某个组件的字段值）。这和 T1 本质一样：**改字段值**，不涉及新增节点/组件。区别只是对象是 `.scene` 不是 `.prefab`。

如果 scene 的节点结构要变（新加场景物体、新加层级），**必须用编辑器**（走 T2 思路）。

---

## 标准流程

### 第 1 步：定位目标组件

用 `tools/find_id_by_name.py` 按节点名找，再按脚本类型过滤：

```bash
python ~/.claude/skills/cocos-prefab-crud/tools/find_id_by_name.py \
    assets/scenes/GameScene.scene Canvas --component GameEntry
# 输出: Canvas → __id__ 3
#        GameEntry component at __id__ 61
```

或直接用 `uuid_compress.py` 查脚本的压缩 uuid，然后 grep scene 里的 `__type__`。

### 第 2 步：Python patch

```python
import json
SCENE = 'assets/scenes/GameScene.scene'

# 读对应 prefab 的 uuid
def prefab_uuid(name):
    with open(f'assets/prefabs/{name}.prefab.meta', encoding='utf-8') as f:
        return json.load(f)['uuid']

with open(SCENE, encoding='utf-8') as f:
    data = json.load(f)

# GameEntry 的压缩类型（从 .ts.meta 算出，或直接搜一次存下来）
GAME_ENTRY_TYPE = '64621kTjcNCf6wk1ZR15+kM'

for obj in data:
    if isinstance(obj, dict) and obj.get('__type__') == GAME_ENTRY_TYPE:
        obj['checkInPrefab'] = {
            '__uuid__': prefab_uuid('CheckInPrefab'),
            '__expectedType__': 'cc.Prefab',
        }
        break

with open(SCENE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
```

### 第 3 步：交付验收

```
【刷新档位】🔴
【用户操作】关闭 GameScene，重新打开（双击场景文件 / Ctrl+W 后重开）
【验收清单】
1. 选中挂 GameEntry 的 Canvas 节点
2. 看 Inspector 里 GameEntry 组件的 checkInPrefab 字段有值（显示 prefab 名字，非红 null）
3. Play 时 GameEntry 的代码能读到该 prefab
```

---

## 常见坑

### 坑 1：`__expectedType__` 写错

```jsonc
// 错：会显示"类型不匹配"
{"__uuid__": "...", "__expectedType__": "cc.Object"}

// 对：必须和 @property 声明类型一致
{"__uuid__": "...", "__expectedType__": "cc.Prefab"}
```

常见类型：`cc.Prefab` / `cc.SpriteFrame` / `cc.AudioClip` / `cc.Texture2D`。

### 坑 2：场景编辑器开着时 Python 改不生效

**现象**：scene 保存时编辑器覆盖了 Python 改动。

**规避**：改之前**务必让用户先保存并关闭 scene 文档**。Python 改完**再让用户打开**。

### 坑 3：场景里有多个同类型组件

**现象**：Python 只找第一个匹配，但实际要改第二个。

**规避**：多条件筛选（`__type__` + 所属 Node 的 `_name`），不要只按 `__type__` 一维找。

```python
# 更安全：组合筛选
for i, obj in enumerate(data):
    if obj.get('__type__') == GAME_ENTRY_TYPE:
        node = data[obj['node']['__id__']]
        if node.get('_name') == 'Canvas':
            target = obj
            break
```

### 坑 4：改完忘了保存 JSON

**现象**：Python 改的变量是内存副本，没 `json.dump` 回磁盘。

**规避**：Python 脚本最后一行必须是 `json.dump(...)`，或用 `with open` 块保证写入。

---

## 批量注入场景

如果一次要注入多个 prefab 引用（比如 3 个），写成表驱动：

```python
bindings = {
    'mainMenuPrefab': 'MainMenuPrefab',
    'levelSelectPrefab': 'LevelSelectPrefab',
    'levelSettlementPrefab': 'LevelSettlementPrefab',
    'checkInPrefab': 'CheckInPrefab',
}

for obj in data:
    if obj.get('__type__') == GAME_ENTRY_TYPE:
        for field, prefab_name in bindings.items():
            obj[field] = {
                '__uuid__': prefab_uuid(prefab_name),
                '__expectedType__': 'cc.Prefab',
            }
        break
```

---

## 何时必须升级到 T2/T3

- scene 里要**新加一个节点**（比如新加一个 UI 层）→ 走 T2 由用户编辑器加
- scene 里要**新挂一个脚本组件**到某节点上 → 由用户编辑器拖，T4 只能改字段
