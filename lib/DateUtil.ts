/**
 * 日期/时间通用工具（微信小游戏兼容）
 *
 * 典型场景：
 * - 签到跨日判断
 * - 每日任务刷新时间
 * - 倒计时格式化
 * - 服务器时间同步
 */
export class DateUtil {

    /** 当前本地时间 YYYY-MM-DD */
    static todayStr(): string {
        return new Date().toISOString().slice(0, 10);
    }

    /** 昨日 YYYY-MM-DD */
    static yesterdayStr(): string {
        return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    }

    /** 某日 YYYY-MM-DD，offsetDay 正整数向未来，负整数向过去 */
    static offsetDayStr(offsetDay: number): string {
        return new Date(Date.now() + offsetDay * 86400000).toISOString().slice(0, 10);
    }

    /** 两个 YYYY-MM-DD 字符串相差天数（dateA - dateB），负数代表 A 早于 B */
    static daysBetween(dateA: string, dateB: string): number {
        const tA = new Date(dateA + 'T00:00:00Z').getTime();
        const tB = new Date(dateB + 'T00:00:00Z').getTime();
        return Math.round((tA - tB) / 86400000);
    }

    /** 是否同一天（基于本地时区） */
    static isSameDay(dateA: string, dateB: string): boolean {
        return dateA === dateB;
    }

    /** 是否跨天（lastDate 早于今天） */
    static isCrossDay(lastDate: string): boolean {
        return lastDate !== DateUtil.todayStr();
    }

    /** 秒数 → mm:ss */
    static formatMMSS(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /** 秒数 → hh:mm:ss */
    static formatHHMMSS(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /** 13 位时间戳（ms） */
    static now(): number {
        return Date.now();
    }

    /** 秒级时间戳 */
    static nowSec(): number {
        return Math.floor(Date.now() / 1000);
    }

    /** 距离"下次刷新时间点"还有多少秒（用于每日 00:00 或定时活动）
     *  hour/minute 是当地时间 */
    static secondsUntil(hour: number, minute: number = 0, second: number = 0): number {
        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, second, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return Math.floor((target.getTime() - now.getTime()) / 1000);
    }
}
