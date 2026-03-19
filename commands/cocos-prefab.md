# 创建 Cocos 预制体

根据用户描述创建预制体，严格遵循以下流程。

## 第一步：判断预制体类型

| 类型 | 判断标准 | 根节点 |
|------|---------|-------|
| 全屏页面 | 覆盖整个屏幕 | Widget四边=0 + 脚本 |
| 嵌入式组件 | 局部区域 | UITransform=自身大小 + 脚本 |
| 游戏对象 | 有碰撞和生命周期 | 脚本 + RigidBody(KINEMATIC) + BoxCollider(isTrigger, z=100) |

## 第二步：分析依赖

1. 读取脚本中所有 `@property` → 显式依赖（必须在 prefab JSON 中绑定）
2. 读取 `getComponent`/`getChildByName`/`children` → 隐式依赖（prefab 中必须预挂这些组件/子节点）
3. 列出依赖的子预制体 → 先创建叶子预制体

## 第三步：构建（一步到位）

1. 创建 `.ts` + `.meta`
2. 立即用 `node tools/cc-uuid.js --uuid <uuid>` 算压缩 UUID
3. 创建 prefab JSON：
   - `__type__` 用压缩 UUID
   - 所有 `@property` 同步写入绑定（`__id__` 或 `__uuid__`）
   - 视觉子节点挂渲染组件：icon→Sprite, shadow→Sprite, label→Label
   - 游戏对象挂碰撞：RigidBody(_type=4) + BoxCollider(isTrigger=true, _size.z=100)

## 第四步：验证

1. `node tools/cc-uuid.js --check-refs` 检查引用
2. 提醒用户刷新编辑器

## 关键规则
- getComponent 用类引用不用字符串
- 回调函数体必须完整实现，不留注释占位
- 不同层之间传递位置必须经过世界坐标中转
