/**
 * 通用事件总线（发布/订阅模式）
 *
 * 用法：
 *   EventBus.getInstance().on('event_name', callback, this);
 *   EventBus.getInstance().emit('event_name', data);
 *   EventBus.getInstance().off('event_name', callback, this);
 *   EventBus.getInstance().offTarget(this);  // 组件销毁时清理所有监听
 */
export default class EventBus {
    private static _instance: EventBus = null;
    private _listeners: Map<string, Array<{ callback: Function; target?: any }>> = new Map();

    public static getInstance(): EventBus {
        if (!this._instance) {
            this._instance = new EventBus();
        }
        return this._instance;
    }

    public on(event: string, callback: Function, target?: any): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ callback, target });
    }

    public off(event: string, callback: Function, target?: any): void {
        if (!this._listeners.has(event)) return;
        const arr = this._listeners.get(event);
        for (let i = arr.length - 1; i >= 0; i--) {
            const item = arr[i];
            if (item.callback === callback && (!target || item.target === target)) {
                arr.splice(i, 1);
            }
        }
        if (arr.length === 0) {
            this._listeners.delete(event);
        }
    }

    public emit(event: string, ...args: any[]): void {
        if (!this._listeners.has(event)) return;
        const arr = this._listeners.get(event).slice();
        for (const item of arr) {
            if (item.target) {
                item.callback.apply(item.target, args);
            } else {
                item.callback(...args);
            }
        }
    }

    /** 移除某个 target 的所有监听（组件 onDestroy 时调用） */
    public offTarget(target: any): void {
        this._listeners.forEach((arr, event) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i].target === target) {
                    arr.splice(i, 1);
                }
            }
            if (arr.length === 0) {
                this._listeners.delete(event);
            }
        });
    }
}
