# T1: 改现有 prefab 的 @property / 文本 / 位置 / 颜色

**适用场景**：prefab 结构已经存在（节点 + 组件都齐），只是要调整字段值。

**分工**：Python 主导，用户验收。

**刷新档位**：🟡（改 prefab JSON → 关开该 prefab 文档即可）

---

## 典型操作

| 需求 | 要改什么字段 |
|---|---|
| 改按钮文字 | 子 Label 组件的 `_string` |
| 移动节点位置 | Node 的 `_lpos.x` / `_lpos.y` |
| 改颜色 | Sprite/Label 组件的 `_color` |
| 绑定新的 @property | 脚本组件的对应字段，写成 `{"__id__": N}` |
| 换 SpriteFrame | Sprite 组件的 `_spriteFrame.__uuid__` |
| 显示/隐藏节点 | Node 的 `_active` |
| 改节点尺寸 | UITransform 组件的 `_contentSize` |

---

## 标准流程

### 第 1 步：读 prefab，定位目标

用 `tools/find_id_by_name.py`：

```bash
python ~/.claude/skills/cocos-prefab-crud/tools/find_id_by_name.py \
    assets/prefabs/MainMenuPrefab.prefab btnLevel
# 输出: btnLevel → __id__ 8 (Node)
#        attached Button component at __id__ 11
```

### 第 2 步：Python patch

用 `tools/patch_property.py` 或直接写专用脚本：

```python
import json
path = 'assets/prefabs/MainMenuPrefab.prefab'
with open(path, encoding='utf-8') as f:
    data = json.load(f)

# 改子 Label 文字
for obj in data:
    if obj.get('__type__') == 'cc.Label' and obj.get('node', {}).get('__id__') == 12:
        obj['_string'] = '新文字'
        break

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
```

### 第 3 步：交付给用户验收

```
【刷新档位】🟡
【用户操作】在 Cocos 里关闭 MainMenuPrefab 文档（Ctrl+W），再打开一次
【验收清单】
1. 按钮文字显示"新文字"
2. 脚本组件 @property 面板无红 null（本次没动绑定也要扫一眼）
3. 按钮 Sprite 有图（没改也确认）
```

---

## 常见坑 + 规避

### 坑 1：改完没反应

**原因**：Cocos 编辑器打开着这个 prefab 文档时，它内存里的副本是旧的，保存会覆盖磁盘改动。

**规避**：改之前问用户"编辑器里开着这个 prefab 吗？"。如果开着，让用户先 Ctrl+S（保存任何在编辑器的改动） → 关掉文档 → 再让我改。

### 坑 2：`__id__` 搞错指向了组件而不是节点

**原因**：脚本 @property 声明 `@property(Node)` 要指向 Node 的 `__id__`，声明 `@property(Button)` 要指向 Button 组件的 `__id__`。这两个是不同的数字！

**规避**：先看 TS 脚本里 @property 的类型声明，再确定绑定目标是 Node 还是 Component。

### 坑 3：改了 Label 文字但编辑器没更新

**原因**：前景色 `_color` 字段被意外清空或改坏，Label 会显示但颜色透明。

**规避**：只改 `_string`，别改 `_color` 除非明确要改。

### 坑 4：SpriteFrame 换图后变白方块

**原因**：新 uuid 拼错，或少了 `@frag` 后缀。

**规避**：
```python
# 错：漏了 @frag
_spriteFrame = {"__uuid__": "d25d66e0-5026-4cfe-a925-6f6af4294bbe", ...}
# 对：完整 SpriteFrame UUID 必须有 @frag
_spriteFrame = {"__uuid__": "d25d66e0-5026-4cfe-a925-6f6af4294bbe@f9941", ...}
```
uuid 从哪查：读目标 `.png.meta`，里面有 `subMetas.{frag}.uuid`。

---

## 什么时候不能用 T1，要升级到 T2

- 要**新加一个组件**（比如给 Node 加 Sprite / Button）—— 组件的创建需要 `CompPrefabInfo` 配对，Python 从零生成容易漏字段 → 走 T2 由编辑器创建
- 要**新加子节点** —— 涉及 `_children` 数组 + `_parent` 回指 + `_prefab` 引用，Python 容易做错 → 走 T2
- 要**改组件顺序** —— `_components` 数组顺序影响渲染层级 → 走编辑器拖

记住：只要是"加新东西"或"改结构拓扑"，就去 T2；只是改字段值就 T1 够了。
