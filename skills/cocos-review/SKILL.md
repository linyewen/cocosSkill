# Cocos Creator 审查与回查验证

创建 prefab、组装场景、修改代码后的验证清单。防止错误积累到最后才发现。

## 触发时机

- 创建完一个 prefab 后
- 场景组装完成后（所有 prefab 实例 + 脚本绑定就位）
- 修改了 .ts 脚本的 @property 后
- 运行预览前的最终检查
- 用 `/cocos-review` 手动触发

---

## A. Prefab 创建后回查

每创建一个 prefab，**立即**逐条检查：

### 结构检查
- [ ] 根对象是 `cc.Prefab`，data 指向 `__id__: 1`
- [ ] 根节点 `_layer = 33554432`（UI_2D），不是 `1073741824`
- [ ] 每个组件后面跟一个 `cc.CompPrefabInfo`（fileId 唯一）
- [ ] 根节点有 `cc.PrefabInfo`（root→1, asset→0）
- [ ] 子节点也各有 `cc.PrefabInfo`
- [ ] `__id__` 索引从 0 开始连续递增，无跳跃

### 脚本检查
- [ ] 自定义脚本 `__type__` 是**压缩 UUID**（如 `"934a7Znyz5DYbLtET0C6WgA"`），不是类名或完整 UUID
- [ ] 所有 `@property` 引用的 `__id__` 指向正确的目标（节点或组件）
- [ ] `@property(Component类型)` 的值是**节点的 __id__**，不是组件的 __id__

### 组件检查
- [ ] Sprite: `_sizeMode = 0` (CUSTOM)
- [ ] Sprite: `_spriteFrame` 非 null（除非代码运行时设置，如 Block 的 icon）
- [ ] Sprite: `_spriteFrame` 的 UUID 有 `@f9941` 后缀
- [ ] Label: `_string` 不是 `"Label"` 占位符
- [ ] Label: `_actualFontSize` = `_fontSize`
- [ ] Label: `_lineHeight` = `_fontSize`（1:1 比例）
- [ ] UITransform: `_contentSize` 非 `(0, 0)`（尤其是按钮节点）
- [ ] Button: `clickEvents` 数组中的 `_componentId` 是压缩 UUID

---

## B. 场景绑定回查

所有 prefab 创建完、场景组装完后执行：

### Camera + Canvas
- [ ] Camera 节点 `_lpos.z = 1000`
- [ ] Camera 节点 `_layer = 1073741824`（不是 33554432）
- [ ] Camera 组件 `_projection = 0`（ORTHO，不是 1）
- [ ] Camera 组件 `_orthoHeight = designHeight / 2`
- [ ] Camera 组件 `_far = 2000`（必须 > Camera z 值）
- [ ] Canvas 组件 `_cameraComponent` 指向 Camera 组件的 `__id__`（非 null）
- [ ] Canvas 组件 `_alignCanvasWithScreen = true`

### Widget 适配
- [ ] Canvas 节点有 Widget（`_alignFlags = 45`）
- [ ] BgLayer/UILayer/PopupLayer 有 Widget（`_alignFlags = 45`）
- [ ] GameLayer **不加** Widget（可能需要移动/缩放）
- [ ] Widget `_alignMode = 2`（ALWAYS）或 `1`（ON_WINDOW_RESIZE）

### 脚本 @property 绑定
- [ ] 所有自定义脚本的 @property **全部已绑定**，无遗漏的 null
- [ ] `@property(Prefab)` 的 `__uuid__` 对应的 .prefab 文件存在
- [ ] `@property(SpriteFrame)` 的 UUID 有 `@f9941` 后缀
- [ ] `@property(AudioClip)` 的 `__expectedType__` 是 `"cc.AudioClip"`
- [ ] `@property([SpriteFrame])` 数组元素数量匹配代码预期（如 5 种方块 = 5 个元素）
- [ ] `@property([Node])` 数组元素数量匹配代码预期

### ProgressBar（如有）
- [ ] `_barSprite` 指向 Bar 子节点的 Sprite 组件（不是节点）
- [ ] Bar 子节点 `UITransform._anchorPoint = (0, 0.5)`（左对齐）
- [ ] Bar 子节点 `position.x = -totalLength/2`
- [ ] Bar 的 Sprite `_type = 1`（SLICED）或 `0`（SIMPLE），**不是 3（FILLED）**
- [ ] `_totalLength` = 父节点 UITransform 宽度

### SceneGlobals
- [ ] `_globals` 指向 `cc.SceneGlobals` 对象
- [ ] SceneGlobals 下有 8 个子对象（Ambient/Shadows/Skybox/Fog/Octree/Skin/LightProbe/PostSettings）

---

## C. 代码修改后回查

修改 .ts 文件后，检查 JSON 是否需要同步：

### @property 变更
- [ ] 新增的 `@property` → 在 scene/prefab JSON 中添加绑定
- [ ] 删除的 `@property` → 在 JSON 中移除（避免 MissingScript 警告）
- [ ] 改名的 `@property` → JSON 中同步更新字段名
- [ ] 类型变更的 `@property` → JSON 中更新引用格式

### 结构变更
- [ ] 新增子节点 → prefab JSON 中添加节点 + 更新所有 `__id__`
- [ ] 删除子节点 → prefab JSON 中移除 + 重算所有 `__id__`
- [ ] 改了 `@ccclass('Name')` → **不影响 JSON**（JSON 用压缩 UUID）

---

## D. 代码审查清单（原 cocos-review 内容）

### 关注点分离
- [ ] 游戏实体的逻辑（脚本/碰撞）和视觉（Sprite/Label）是否在不同节点
- [ ] 可见对象是否通过 `instantiate(prefab)` 创建，而非 `new Node()` 拼凑
- [ ] 外观是否在编辑器/MCP 设好，代码是否只管行为
- [ ] 有没有 `addComponent(Graphics)` 画圆画方块充当游戏视觉

### 模块化
- [ ] 重复的节点结构是否提取为独立 prefab
- [ ] View 和 Item 职责是否清晰（View 管布局，Item 管展示）
- [ ] `getComponent` 用类引用不用字符串
- [ ] `import` 只引入实际使用的符号

### 引擎规范
- [ ] 碰撞判断用 `getComponent(类)` 不用 `getGroup()`
- [ ] 碰撞注册在 onLoad，注销在 onDestroy
- [ ] 子类覆盖生命周期调了 super
- [ ] 坐标跨层传递经过世界坐标中转

---

## E. Python 自动验证脚本

将以下脚本保存到项目根目录，创建后直接运行：

```python
# verify_scene.py — 验证场景文件
import json, sys, os, glob

def verify_scene(scene_path):
    with open(scene_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    errors = []
    
    # Camera
    for i, obj in enumerate(data):
        if obj.get('_name') == 'Camera' and obj.get('__type__') == 'cc.Node':
            if obj.get('_lpos', {}).get('z', 0) != 1000:
                errors.append(f"Camera z={obj['_lpos']['z']}, should be 1000")
            if obj.get('_layer') != 1073741824:
                errors.append(f"Camera _layer={obj.get('_layer')}, should be 1073741824")
    
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Camera':
            if obj.get('_projection') != 0:
                errors.append(f"Camera projection={obj['_projection']}, should be 0 (ORTHO)")
            if obj.get('_far', 0) < 1001:
                errors.append(f"Camera far={obj['_far']}, should be >= 2000")
    
    # Canvas._cameraComponent
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Canvas':
            if not obj.get('_cameraComponent'):
                errors.append("Canvas._cameraComponent is null — will be BLACK SCREEN")
    
    # Widget
    widget_nodes = set()
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Widget':
            nid = obj.get('node', {}).get('__id__', -1)
            name = data[nid].get('_name', '?') if 0 <= nid < len(data) else '?'
            widget_nodes.add(name)
    for required in ['Canvas']:
        if required not in widget_nodes:
            errors.append(f"Missing Widget on '{required}'")
    
    # Sprites
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Sprite':
            nid = obj.get('node', {}).get('__id__', -1)
            name = data[nid].get('_name', '?') if 0 <= nid < len(data) else '?'
            if obj.get('_sizeMode') not in [0, None]:
                if obj.get('_sizeMode') == 1:
                    errors.append(f"Sprite on '{name}' sizeMode=TRIMMED, recommend CUSTOM(0)")
            if obj.get('_spriteFrame') is None:
                errors.append(f"WARNING: Sprite on '{name}' spriteFrame is null")
    
    # Labels
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Label':
            nid = obj.get('node', {}).get('__id__', -1)
            name = data[nid].get('_name', '?') if 0 <= nid < len(data) else '?'
            if obj.get('_string') == 'Label':
                errors.append(f"Label on '{name}' has placeholder text 'Label'")
            if obj.get('_fontSize', 0) != obj.get('_actualFontSize', 0):
                errors.append(f"Label on '{name}' fontSize≠actualFontSize")
    
    return errors

def verify_prefab(prefab_path):
    with open(prefab_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    errors = []
    name = os.path.basename(prefab_path)
    
    # Root structure
    if data[0].get('__type__') != 'cc.Prefab':
        errors.append(f"{name}: root is not cc.Prefab")
    
    # _layer check
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Node':
            if obj.get('_layer') == 1073741824:
                errors.append(f"{name}[{i}]: _layer=1073741824 (scene value), should be 33554432 (UI_2D)")
    
    # Custom script __type__ check
    builtin = {'cc.', 'CCObject'}
    for i, obj in enumerate(data):
        t = obj.get('__type__', '')
        if t and not any(t.startswith(p) for p in builtin):
            # Should be compressed UUID (alphanumeric + /+=)
            if '-' in t:
                errors.append(f"{name}[{i}]: __type__='{t}' looks like full UUID, should be compressed")
            elif t[0].isupper() and t.isalpha():
                errors.append(f"{name}[{i}]: __type__='{t}' looks like class name, should be compressed UUID")
    
    # Sprite checks
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Sprite':
            if obj.get('_sizeMode', 0) != 0:
                errors.append(f"{name}[{i}]: Sprite sizeMode={obj['_sizeMode']}, recommend 0")
    
    # Label checks
    for i, obj in enumerate(data):
        if obj.get('__type__') == 'cc.Label':
            if obj.get('_string') == 'Label':
                errors.append(f"{name}[{i}]: Label placeholder 'Label'")
            if obj.get('_fontSize') != obj.get('_actualFontSize'):
                errors.append(f"{name}[{i}]: fontSize≠actualFontSize")
    
    return errors

# Main
if __name__ == '__main__':
    project_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    
    all_errors = []
    
    for scene in glob.glob(os.path.join(project_dir, 'assets/**/*.scene'), recursive=True):
        errs = verify_scene(scene)
        for e in errs:
            all_errors.append(f"[SCENE {os.path.basename(scene)}] {e}")
    
    for prefab in glob.glob(os.path.join(project_dir, 'assets/**/*.prefab'), recursive=True):
        errs = verify_prefab(prefab)
        for e in errs:
            all_errors.append(f"[PREFAB {os.path.basename(prefab)}] {e}")
    
    if all_errors:
        print(f"\n❌ Found {len(all_errors)} issues:\n")
        for e in all_errors:
            print(f"  {e}")
    else:
        print("\n✅ ALL CHECKS PASSED")
```

### 使用方式

```bash
python3 verify_scene.py E:/aicocos/project_1
```
