# 自定义脚本组件 + 压缩 UUID + MCP 限制 + 实战模式

---

## 自定义脚本组件

```json
{
  "__type__": "d96f8WGQb5Ha4h2DeoRzYcq",
  "_name": "",
  "_objFlags": 0,
  "node": { "__id__": 1 },
  "_enabled": true,
  "__editorExtras__": {},
  "__prefab": { "__id__": 9 },
  "shadow": { "__id__": 14 },
  "icon": { "__id__": 19 },
  "shotNode": { "__id__": 37 },
  "_id": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `__type__` | 压缩 UUID 或完整 UUID，不是类名 | MCP attach_script 获取压缩格式，或从 .meta 读完整 UUID |
| `@property(Node)` | 值是 `{"__id__": N}` | N 是目标**节点**在数组中的下标 |
| `@property(Component)` | 值是 `{"__id__": N}` | **N 是目标组件在数组中的下标（不是节点！）** |
| `@property(Prefab)` | 值是 `{"__uuid__": "...", "__expectedType__": "cc.Prefab"}` | UUID 指向另一个 prefab 资源 |
| `@property(SpriteFrame)` | 值是 `{"__uuid__": "...@f9941", "__expectedType__": "cc.SpriteFrame"}` | 注意 @f9941 后缀 |
| 数组类型的 @property | 值是 `[{"__id__": N1}, {"__id__": N2}]` | Node 数组指节点，Component 数组指组件 |

---

## 自定义脚本 __type__ 的三种格式

| 格式 | 示例 | 是否正确 |
|------|------|---------|
| 类名 | `"Block"` | ❌ 报 Missing class: Block |
| 完整 UUID | `"911d1e2b-20ab-4210-9891-2fcabf83bc65"` | ❌ 报 Missing class: 911d1e2b-... |
| **压缩 UUID** | `"911d14rIKtCEJiRL8q/g7xl"` | ✅ 唯一正确格式 |

---

## 脚本压缩 UUID 算法（实测逆向验证，6 组数据 100% 匹配）

Prefab/Scene JSON 中自定义脚本的 `__type__` 字段使用 Cocos 专有的压缩 UUID 格式，**不是标准 base64**。

### 算法步骤

```
输入: 完整 UUID（从 .ts.meta 的 "uuid" 字段获取）
      如 c22cebec-ee74-4e88-a4f6-71edbf2e67c4

1. 去掉短横线 → 32位十六进制: c22cebecee744e88a4f671edbf2e67c4
2. 前 5 位保持不变 → c22ce
3. 后 27 位当作大整数 → int("becee744e88a4f671edbf2e67c4", 16)
4. 大整数转 base64（字符表: A-Za-z0-9+/，大端序高位在前）→ vs7nROiKT2ce2/LmfE
5. 拼接 → c22cevs7nROiKT2ce2/LmfE（23字符）
```

### Python 工具函数

```python
BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

def compress_uuid(uuid_str: str) -> str:
    """Cocos Creator 脚本压缩 UUID（用于 prefab/scene JSON 的 __type__ 字段）"""
    clean = uuid_str.replace('-', '')
    prefix = clean[:5]
    val = int(clean[5:], 16)
    result = []
    while val > 0:
        result.append(BASE64_KEYS[val % 64])
        val //= 64
    result.reverse()
    return prefix + ''.join(result)

# 用法：读 .ts.meta 的 uuid，算出 prefab 中应填的 __type__
# uuid = "c22cebec-ee74-4e88-a4f6-71edbf2e67c4"  → "c22cevs7nROiKT2ce2/LmfE"
```

> ⚠️ **铁律**：绝不用标准 `base64.b64encode()`，必须用上面的大整数 base64 算法。标准 base64 得到的结果完全不同，会导致 "Script missing" 错误。

### 获取压缩 UUID 的方式（按优先级）

| 方式 | 适用场景 | 操作 |
|------|---------|------|
| 1. 从已有 prefab 读取 | 脚本已挂载到某个 prefab | 读 prefab JSON 找 `__type__` 非 `cc.` 的条目 |
| 2. 用上面的算法计算 | 已知 .ts.meta 中的 UUID | `compress_uuid(meta_uuid)` |
| 3. 从 library 读取 | 编辑器已编译 | 读 `.assets-data.json` 的 `dependScripts` |
| 4. MCP attach_script 返回值 | 通过 MCP 操作过 | 返回 "Available components: cc.UITransform, 911d14rIKtCEJiRL8q/g7xl"，后者即压缩 UUID |

---

## MCP 工具已知限制（必要时绕过）

| MCP 操作 | 问题 | 解决方案 |
|---------|------|---------|
| `create_prefab` | 不保存之前 `set_component_property` 的修改 | 直接用 Python 编辑 prefab JSON |
| `attach_script` | 返回 "not found" 但实际已挂载 | 看返回的 Available components 确认 |
| `set_component_property` 数组类型 | 无 `spriteFrameArray` propertyType | 直接编辑场景/prefab JSON 文件 |
| `find_asset_by_name` | 不返回 spriteFrame 子资源 | 用 `imageUuid@f9941` 格式拼接 |
| `update_prefab` 后 | 可能把 spriteFrame 覆盖为 null | 先 Python 编辑 JSON，再 reimport_asset |

更完整的 MCP 坑和协调流程见 `cocos-prefab-crud` skill。

---

## 图片 .meta 批量转换

新导入的图片默认 `type: texture`，没有 SpriteFrame 子资源。需要：

1. 修改 `.meta` 文件：`userData.type` 从 `"texture"` 改为 `"sprite-frame"`
2. 删除 `userData.redirect` 字段
3. 添加 `f9941` 子资源到 `subMetas`
4. 在编辑器中刷新资源（refresh + reimport）

Python 批量脚本参见 `scene-setup` skill。

---

## _layer 值规则（project_1 实测验证）

| 节点类型 | `_layer` 值 | 说明 |
|---------|-----------|------|
| Scene 中 Canvas 及所有 UI 子节点 | `1073741824` | DEFAULT 层 |
| Scene 中 Camera 节点 | `1073741824` | 同上 |
| Prefab 中所有节点 | `1073741824` | 同上 |

> ⚠️ 旧版写的 `33554432`(UI_2D) 经 project_1 和 project_2 实测均不正确。统一用 `1073741824`。

---

## @property 绑定全变体速查

| TypeScript 声明 | JSON 格式 | 说明 |
|----------------|-----------|------|
| `@property(Node)` | `{"__id__": N}` | N = 目标**节点**在数组中的下标 |
| `@property(Label)` | `{"__id__": N}` | **N 是 cc.Label 组件的下标**（不是节点！） |
| `@property(Sprite)` | `{"__id__": N}` | **N 是 cc.Sprite 组件的下标** |
| `@property(ProgressBar)` | `{"__id__": N}` | **N 是 cc.ProgressBar 组件的下标** |
| `@property(自定义脚本)` | `{"__id__": N}` | **N 是脚本组件的下标**（如 GridManager） |
| `@property(Prefab)` | `{"__uuid__":"...","__expectedType__":"cc.Prefab"}` | 外部资源用 UUID |
| `@property(SpriteFrame)` | `{"__uuid__":"...@f9941","__expectedType__":"cc.SpriteFrame"}` | 注意 @f9941 |
| `@property(AudioClip)` | `{"__uuid__":"...","__expectedType__":"cc.AudioClip"}` | 无子资源后缀 |
| `@property(cc.TTFFont)` | `{"__uuid__":"...","__expectedType__":"cc.TTFFont"}` | 自定义字体 |
| `@property([Node])` | `[{"__id__":N1},{"__id__":N2}]` | 数组，每个 N 是节点下标 |
| `@property([SpriteFrame])` | `[{"__uuid__":"..@f9941",...},...]` | 数组 |
| `@property(number)` | `42` 或 `3.14` | 直接值 |
| `@property(string)` | `"hello"` | 直接值 |
| `@property(boolean)` | `true` / `false` | 直接值 |

**⚠️ 关键规则（project_1 实测验证）**：
- **`@property(Component 类型)` 的值是该组件的 `__id__`，不是节点的 `__id__`！**
- **`@property(Node)` 的值才是节点的 `__id__`**
- 示例：`@property(Label) timerLabel` → `{"__id__": 30}` 其中 `[30]` 是 `cc.Label` 组件
- 示例：`@property(Node) fxLayer` → `{"__id__": 38}` 其中 `[38]` 是 `cc.Node` 节点

---

## Widget 实战模式（三个真实项目统计）

| `_alignFlags` | 含义 | 使用频率 |
|-------------|------|---------|
| `45` | 全屏拉伸 | ★★★★★ 最常用 |
| `17` | 左上角锚定 | ★★★ |
| `0` | 无对齐 | ★★ |
| 其他 | 特殊定位 | ★ |

全部使用绝对像素（`_isAbs=true`），无人用百分比模式。

---

## Sprite 实战模式

| `_type` | 名称 | 使用场景 |
|-------|------|---------|
| 0 | SIMPLE | 普通图片（99% 的情况） |
| 1 | SLICED | 按钮背景、面板背景（九宫格拉伸） |
| 3 | FILLED | 仅用于进度条 |
| 2 | TILED | 几乎不用 |

`_sizeMode` 决策：默认 TRIMMED(1)，需固定尺寸才 CUSTOM(0)（详见 `ui-components.md` 的 Sprite 章节）。
