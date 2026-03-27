# Cocos Creator 代码审查

审查改动的代码，只报告违反的条目。

## 关注点分离
- [ ] 游戏实体的逻辑（脚本/碰撞）和视觉（Sprite/Label）是否在不同节点
- [ ] 可见对象是否通过 `instantiate(prefab)` 创建，而非 `new Node()` 拼凑
- [ ] 外观是否在编辑器/MCP 设好，代码是否只管行为
- [ ] 有没有 `addComponent(Graphics)` 画圆画方块充当游戏视觉

## 模块化
- [ ] 重复的节点结构是否提取为独立 prefab
- [ ] View 和 Item 职责是否清晰（View 管布局，Item 管展示）
- [ ] `getComponent` 用类引用不用字符串
- [ ] `import` 只引入实际使用的符号

## 引擎规范
- [ ] Camera 和 Canvas Z 坐标有距离（Camera z=1000, Canvas z=0）
- [ ] 碰撞判断用 `getComponent(类)` 不用 `getGroup()`
- [ ] 碰撞注册在 onLoad，注销在 onDestroy
- [ ] 子类覆盖生命周期调了 super
- [ ] 坐标跨层传递经过世界坐标中转
- [ ] 新增 @property 同步绑定了 scene/prefab JSON

## 改动影响
- [ ] 被修改节点的引用链是否完整
- [ ] 从触发到效果走一遍调用链
