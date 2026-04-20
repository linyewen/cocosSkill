---
name: UI 残留防治（clearPopupLayer + 自销毁 MODE_SELECTED）
description: 游戏里模式切换/retry/跳关时常见 UI 堆叠问题的通用修复模式
type: feedback
---
**问题模式**：游戏有多个全屏 UI（主菜单、关卡结算、暂停菜单、DEV 面板、库存、签到...），挂 popupLayer 上。某些路径会**重复 instantiate 但没销毁旧的**，导致 UI 层层堆叠，文字交叠、按钮重复。

**两层防线**：

### 防线 1：GameEntry 层 `clearPopupLayer()` 在切换前清场

```ts
private clearPopupLayer(): void {
    if (!this.popupLayer) return;
    for (const child of [...this.popupLayer.children]) {
        if (child && child.isValid) child.destroy();
    }
}

// 在所有切场景点调用：
private startLevel(levelNo: number): void {
    this.clearPopupLayer();  // 先清后 spawn
    this.spawnItemBar();
    this.spawnHudInfo();
    // ...
}

private startEndless(): void {
    this.clearPopupLayer();
    // ...
}

private showMainMenu(): void {
    this.clearPopupLayer();
    instantiate(this.mainMenuPrefab);
    // ...
}

// Settlement 弹出前也清（保留结算 prefab 自己刚 instantiate 的）：
this.fsm.onSettlement = (isWin) => {
    this.clearPopupLayer();
    const popup = instantiate(prefab);  // 清完马上加
    this.popupLayer.addChild(popup);
};
```

### 防线 2：Controller 层监听 MODE_SELECTED 自销毁

```ts
// 任何全屏 UI Controller 的 start()：
start(): void {
    // 原有 button 监听...
    EventBus.getInstance().on(GameEvents.MODE_SELECTED, this.onDestroySelf, this);
}

private onDestroySelf(): void {
    if (this.node && this.node.isValid) this.node.destroy();
}

onDestroy(): void {
    EventBus.getInstance().off(GameEvents.MODE_SELECTED, this.onDestroySelf, this);
}
```

**Why 两层？**
- 只靠防线 1：Controller 可能异步路径 spawn 出来的（比如 DEV 面板 → 跳关 → ItemBar），错过清场时机
- 只靠防线 2：依赖发了 `MODE_SELECTED` 事件，某些路径（比如战斗失败弹结算）不走这个事件
- 两层互相兜底，保证在**任何路径下都无残留**

**踩坑场景（2026-04-20 ProjectDrop）**：
- 玩家反复死亡 retry → 每次 retry 都 spawn 新 ItemBar / HudInfo / BulletShop 但没销毁旧的
- 5 次 retry 后屏幕堆了 5 层 UI，文字全糊住
- 修完后：任何路径（DEV 跳关、retry、回主菜单）都干净

**How to apply**：
- 新项目一开始就用两层防线
- `GameEntry` 里一定加 `clearPopupLayer()` 作为基础工具
- 每个全屏 UI Controller 都加 `MODE_SELECTED` 自销毁
