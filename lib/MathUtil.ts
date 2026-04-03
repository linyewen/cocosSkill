import { Vec2, v2 } from 'cc';

/**
 * 通用数学工具库
 *
 * 包含：随机数、角度/距离计算、贝塞尔曲线、八字形路径等。
 * 纯静态方法，无状态，无引擎生命周期依赖。
 */
export default class MathUtil {

    /** 获取 [min, max) 范围内的随机整数 */
    public static getRandomInt(min: number = 0, max: number = 1): number {
        return Math.floor(Math.random() * (max - min) + min);
    }

    /** 伪随机数（用于需要可重现的随机序列） */
    public static getPseudoRandomInt(seed: number, key: number): number {
        return Math.ceil((((seed * 9301 + 49297) % 233280) / 233280) * key);
    }

    /** 两点间角度（弧度） */
    public static getAngle(p1: Vec2, p2: Vec2): number {
        return Math.atan((p2.y - p1.y) / (p2.x - p1.x));
    }

    /** 两点间距离 */
    public static getDistance(p1: Vec2, p2: Vec2): number {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /** 角度转弧度 */
    public static angleToRadian(angle: number): number {
        return angle * Math.PI / 180;
    }

    /** 浮点数安全加法（避免精度丢失） */
    public static addSafely(a: number, b: number): number {
        const aDigits = (a.toString().split('.')[1] || '').length;
        const bDigits = (b.toString().split('.')[1] || '').length;
        const multiplier = Math.pow(10, Math.max(aDigits, bDigits));
        return (a * multiplier + b * multiplier) / multiplier;
    }

    /** 获取 [0, 1) 随机概率 */
    public static getRandomProbability(): number {
        return Math.random();
    }

    /** 二次贝塞尔曲线上的点 */
    public static getQuadraticBezierPoint(t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const p = v2();
        p.x = uu * p0.x + 2 * u * t * p1.x + tt * p2.x;
        p.y = uu * p0.y + 2 * u * t * p1.y + tt * p2.y;
        return p;
    }

    /** 二次贝塞尔曲线的切线方向（归一化） */
    public static getQuadraticBezierTangent(t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 {
        const p = v2();
        p.x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
        p.y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
        return p.normalize();
    }

    /** 三次贝塞尔曲线上的点 */
    public static getCubicBezierPoint(t: number, p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): Vec2 {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        const p = v2();
        p.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        p.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        return p;
    }

    /** 三次贝塞尔曲线的切线方向（归一化） */
    public static getCubicBezierTangent(t: number, p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): Vec2 {
        const mt = 1 - t;
        const p = v2();
        p.x = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
        p.y = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
        return p.normalize();
    }

    /** 八字形路径上的点（用于巡逻/闲逛运动） */
    static getFigureEightPoint(t: number, scaleX: number, scaleY: number): Vec2 {
        const x = Math.sin(t) * scaleX;
        const y = Math.sin(t * 2) * scaleY;
        return v2(x, y);
    }
}
