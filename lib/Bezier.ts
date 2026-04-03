import { _decorator, Component, Node, Graphics, Vec2, Vec3, v2, v3, tween, UITransform } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 贝塞尔曲线运动组件
 *
 * 在编辑器中可视化编辑曲线路径，运行时让节点沿曲线移动。
 *
 * 使用方式：
 *   1. 创建一个节点，挂载此组件 + Graphics 组件
 *   2. 创建 4 个子节点：p1（起点）、c1（控制点1）、c2（控制点2）、p2（终点）
 *   3. 在编辑器中拖拽 4 个子节点调整曲线形状
 *   4. 代码中：bezier.startMove(targetNode, duration, callback);
 *
 * 支持：
 *   - 编辑器实时预览曲线
 *   - 起止点追踪器（动态跟踪其他节点）
 *   - 随机化控制点（同一曲线产生不同变体）
 *   - 反向播放
 */
@ccclass('Bezier')
@executeInEditMode
export default class Bezier extends Component {
    @property({ type: Node, tooltip: '起始点追踪器（可选，运行时动态跟踪目标位置）' })
    p1Tracker: Node = null;

    @property({ type: Node, tooltip: '终止点追踪器（可选）' })
    p2Tracker: Node = null;

    @property({ tooltip: '是否随机化控制点（同一路径产生不同变体）' })
    random = false;

    @property({ tooltip: '运行时显示曲线（调试用）' })
    debug = false;

    p1: Node = null;
    c1: Node = null;
    c2: Node = null;
    p2: Node = null;
    g: Graphics = null;

    protected onLoad(): void {
        this.g = this.getComponent(Graphics);
        this.p1 = this.node.getChildByName('p1');
        this.c1 = this.node.getChildByName('c1');
        this.c2 = this.node.getChildByName('c2');
        this.p2 = this.node.getChildByName('p2');
        if (!EDITOR) {
            if (this.p1) this.p1.active = false;
            if (this.c1) this.c1.active = false;
            if (this.c2) this.c2.active = false;
            if (this.p2) this.p2.active = false;
        }
    }

    /**
     * 让节点沿贝塞尔曲线移动
     * @param node 要移动的节点
     * @param time 移动时长（秒）
     * @param callback 移动完成回调
     * @param obsv 回调的 this 指向
     * @param onUpdate 每帧回调（可用于旋转朝向等）
     * @param reverse 1 = 反向移动
     */
    startMove(
        node: Node,
        time: number,
        callback: Function = null,
        obsv: any = null,
        onUpdate: (node: Node, t: number, pos: Vec2, lastPos: Vec2) => void = null,
        reverse: number = 0
    ) {
        if (!node) return;
        let points = this.getBezierPoints(node, reverse);
        (node as any).num = 0;
        node.setPosition(points[0].x, points[0].y, 0);
        let lastPos = v2(points[0].x, points[0].y);
        tween(node)
            .to(time, { num: time } as any, {
                progress: (start: number, end: number, current: number, ratio: number) => {
                    let t = ratio;
                    let x =
                        Math.pow(1 - t, 3) * points[0].x +
                        3 * Math.pow(1 - t, 2) * t * points[1].x +
                        3 * (1 - t) * Math.pow(t, 2) * points[2].x +
                        Math.pow(t, 3) * points[3].x;
                    let y =
                        Math.pow(1 - t, 3) * points[0].y +
                        3 * Math.pow(1 - t, 2) * t * points[1].y +
                        3 * (1 - t) * Math.pow(t, 2) * points[2].y +
                        Math.pow(t, 3) * points[3].y;

                    let pos = v2(x, y);
                    node.setPosition(x, y, 0);
                    if (onUpdate) {
                        onUpdate(node, t, pos, lastPos);
                    }
                    lastPos = v2(x, y);
                    return ratio;
                }
            })
            .call(() => {
                if (callback) callback.call(obsv, node);
            })
            .start();
    }

    getBezierPoints(node: Node, reverse: number = 0) {
        let p1 = this.convertToNodeSpace(node, this.p1);
        let c1 = this.convertToNodeSpace(node, this.c1);
        let c2 = this.convertToNodeSpace(node, this.c2);
        let p2 = this.convertToNodeSpace(node, this.p2);
        if (this.random) {
            let mc1 = this.calcMirrorD(p1, p2, c1);
            c1 = this.getRandomP(c1, mc1);
            let mc2 = this.calcMirrorD(p1, p2, c2);
            c2 = this.getRandomP(c2, mc2);
        }
        let points = [v2(p1.x, p1.y), v2(c1.x, c1.y), v2(c2.x, c2.y), v2(p2.x, p2.y)];
        if (reverse == 1) {
            points = [points[3], points[2], points[1], points[0]];
        }
        return points;
    }

    updateTracker() {
        if (this.p1Tracker) {
            let nodePos = this.convertToNodeSpace(this.p1, this.p1Tracker);
            this.p1.setPosition(nodePos);
        }
        if (this.p2Tracker) {
            let nodePos = this.convertToNodeSpace(this.p2, this.p2Tracker);
            this.p2.setPosition(nodePos);
        }
    }

    update() {
        if (EDITOR) {
            this.updateTracker();
            this.draw();
        } else {
            if (this.debug) {
                this.draw();
            }
        }
    }

    private draw() {
        if (!this.debug && !EDITOR) return;
        if (!this.p1 || !this.c1 || !this.c2 || !this.p2) {
            if (this.g) this.g.clear();
            return;
        }
        let p1Pos = this.p1.position;
        let c1Pos = this.c1.position;
        let c2Pos = this.c2.position;
        let p2Pos = this.p2.position;
        this.g.clear();
        this.g.moveTo(p1Pos.x, p1Pos.y);
        this.g.bezierCurveTo(c1Pos.x, c1Pos.y, c2Pos.x, c2Pos.y, p2Pos.x, p2Pos.y);
        this.g.stroke();
    }

    private convertToNodeSpace(p1: Node, p2: Node): Vec3 {
        const worldPos = p2.parent.getComponent(UITransform).convertToWorldSpaceAR(p2.position);
        return p1.parent.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
    }

    private calcMirrorD(A: Vec3, B: Vec3, C: Vec3): Vec3 {
        let AB = B.clone().subtract(A);
        let AC = C.clone().subtract(A);
        let NAB = AB.clone().normalize();
        let NAC = AC.clone().normalize();
        let cT = Vec3.dot(NAB, NAC);
        let tyLen = AC.length() * cT;
        let AE = NAB.clone().multiplyScalar(tyLen);
        let E = A.clone().add(AE);
        let CE = E.clone().subtract(C);
        let CE2 = CE.clone().multiplyScalar(2);
        let D = C.clone().add(CE2);
        return D;
    }

    private getRandomP(A: Vec3, B: Vec3): Vec3 {
        let AB = B.clone().subtract(A);
        let RAC = AB.clone().multiplyScalar(Math.random());
        return A.clone().add(RAC);
    }
}
