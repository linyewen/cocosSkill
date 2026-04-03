import { NodePool, Node, isValid } from 'cc';

/**
 * 从对象池中安全获取节点
 * 自动跳过已销毁的无效节点，避免 setParent 时崩溃
 *
 * Cocos 3.x 中 NodePool 可能残留已销毁的节点引用，
 * 直接 pool.get() 拿到无效节点会导致 addChild 崩溃。
 */
export function safePoolGet(pool: NodePool): Node | null {
    while (pool.size() > 0) {
        const node = pool.get();
        if (node && isValid(node)) {
            return node;
        }
        // 无效节点，丢弃，继续取下一个
    }
    return null;
}

/**
 * 安全回收节点到对象池
 * pool.put() 只存引用不会从父节点移除，需要手动 removeFromParent
 */
export function safePoolPut(pool: NodePool, node: Node): void {
    if (!node || !isValid(node)) return;
    node.removeFromParent();
    pool.put(node);
}
