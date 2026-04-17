# T2: 给现有 prefab 新加节点 / 新加组件

**适用场景**：prefab 结构已存在，要往里加东西（新 Node、新 Component、新子层级）。

**分工**：**编辑器主导**（用户手动加），Python 补 @property 绑定。

**刷新档位**：🟡（改完 prefab JSON → 关开该 prefab 文档）

---

## 为什么不能 Python 硬加

Cocos 的 prefab JSON 每个 Node/Component 都配套了 fileId、`__prefab`（指向 PrefabInfo / CompPrefabInfo）、父子 `_parent`/`_children` 的双向引用。Python 从零造这些关系**很容易漏字段**，且漏的字段 Cocos 加载时不一定立刻报错，但 Play 时会出现"节点不显示""组件方法不触发""prefab 实例同步失败"等诡异现象。

编辑器生成的是"经过 Cocos 验证的标准结构"，安全。

---

## 标准流程

### 第 1 步：Claude 写清楚要做什么，交给用户

模板：

```
【要在 prefab】MainMenuPrefab
【在哪个父节点下】content
【新加节点】
  - name: signInBtn
  - 尺寸 UITransform: 200 × 80
  - 位置 _lpos: (200, -400, 0)
  - 组件: Sprite + Button
  - 子节点: label（Label 组件，文字"签到"）
【补说明】这是主菜单右下角的签到按钮入口，点击后触发新事件 CHECK_IN_CLICKED
```

### 第 2 步：用户在编辑器操作

1. 打开对应 prefab
2. 在指定父节点下右键 → 创建节点（或从节点模板库拖一个 Button）
3. 按说明设置尺寸 / 位置 / 加组件 / 加子节点
4. Ctrl+S 保存
5. 关闭 prefab 文档

### 第 3 步：Claude 用 Python 补绑定

用户完成后，用 `tools/find_id_by_name.py` 扫一遍新节点的 `__id__`，然后 Python 把 @property 引用写进脚本组件字段（和 T1 同样手法）。

### 第 4 步：交付验收

```
【刷新档位】🟡
【用户操作】关闭 prefab 文档，重新打开
【验收清单】
1. 新节点显示位置 / 尺寸 / 文字正确
2. 脚本组件 @property 面板能看到新绑定
3. Play 时点新节点（按钮）能触发事件
```

---

## 如果需要加**新脚本类型**作为组件

比如要给新节点加 `MainMenuController` 以外的 `CheckInController`：

1. 先走 Cocos 正常"新加脚本"流程（Write 新 `.ts` 文件，**不**预生成 `.ts.meta`）
2. 让用户启动/重启编辑器（⛔ 档），Cocos 会自动生成 `.ts.meta` 和组件类注册
3. 用户在编辑器里把脚本拖到对应节点作为组件
4. 回到 T1 / T4 补 @property

**不要跳步直接 Python 写脚本组件 `__type__`**，因为：
- `.ts.meta` uuid 若由 Cocos 生成，和我 Python 预测的压缩值会不一致
- 即使一致，编辑器没重启时组件类 hash 表里没这个类，Play 会报"找不到组件类"

---

## 常见坑

### 坑 1：用户加完节点后 @property 面板突然丢了

**原因**：用户保存时编辑器可能重排了 `__id__`，旧的 Python 绑定指向了错的节点。

**规避**：每次用户加完节点，我**重新扫一次** `find_id_by_name.py`，不复用之前的 `__id__`。

### 坑 2：父子节点层级没选对

**原因**：用户在错的父节点下创建了新节点，导致 Widget/布局计算错位。

**规避**：交付说明里明确指出父节点的完整路径（如 `MainMenuPrefab/content/rightPanel`），不用简称。

### 坑 3：组件顺序影响渲染

**原因**：同一个 Node 上的 Sprite / Label 顺序决定渲染叠层。

**规避**：如果要求特定渲染顺序，在说明里明标"先加 Sprite，再加 Label"。

---

## 反面案例（别做）

❌ "让 Python 帮用户加节点节省时间"
```python
# 这种代码看起来合理实际很脆
new_node = {"__type__": "cc.Node", "_name": "newBtn", ...}
data.append(new_node)
parent_node["_children"].append({"__id__": new_idx})
```

这段会：
- 漏 `__prefab` 指向 PrefabInfo
- 漏 CompPrefabInfo 配对
- 可能漏 `_lpos` / `_lrot` 等默认字段
- Cocos 加载时可能静默跳过这个节点

**正确做法**：让用户在编辑器里加，2 分钟的事。
