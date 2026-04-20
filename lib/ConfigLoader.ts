import { resources, JsonAsset } from 'cc';

/**
 * 配置表加载器
 *
 * 把 Excel / CSV 导出的 JSON 配置统一管理：
 * - 一次加载，永久缓存
 * - 按主键查找
 * - 遍历全表
 *
 * 配置文件约定：
 * - 放在 `assets/resources/config/` 下
 * - 根节点是数组 `[ {id:1,...}, {id:2,...} ]`
 * - 或对象索引 `{ "1": {...}, "2": {...} }`
 *
 * 使用示例：
 *   await ConfigLoader.getInstance().loadAll(['levels', 'items', 'enemies']);
 *   const lv = ConfigLoader.getInstance().getById<LevelDef>('levels', 5);
 */
export class ConfigLoader {
    private static _instance: ConfigLoader = null;
    private tables: Map<string, any[]> = new Map();
    private indexes: Map<string, Map<string | number, any>> = new Map();

    static getInstance(): ConfigLoader {
        if (!this._instance) this._instance = new ConfigLoader();
        return this._instance;
    }

    private constructor() {}

    /** 批量加载多个表；全部完成才 resolve */
    async loadAll(tableNames: string[], primaryKey: string = 'id'): Promise<void> {
        await Promise.all(tableNames.map(name => this.load(name, primaryKey)));
    }

    /** 加载单表 */
    load(tableName: string, primaryKey: string = 'id'): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.tables.has(tableName)) {
                resolve();
                return;
            }
            resources.load(`config/${tableName}`, JsonAsset, (err, asset) => {
                if (err) {
                    console.warn(`[ConfigLoader] failed to load ${tableName}`, err);
                    reject(err);
                    return;
                }
                const json = asset.json;
                let arr: any[];
                if (Array.isArray(json)) {
                    arr = json;
                } else if (json && typeof json === 'object') {
                    arr = Object.values(json);
                } else {
                    arr = [];
                }
                this.tables.set(tableName, arr);

                const index = new Map<string | number, any>();
                for (const row of arr) {
                    if (row && row[primaryKey] !== undefined) {
                        index.set(row[primaryKey], row);
                    }
                }
                this.indexes.set(tableName, index);
                console.log(`[ConfigLoader] ${tableName} loaded: ${arr.length} rows`);
                resolve();
            });
        });
    }

    /** 按主键查 */
    getById<T = any>(tableName: string, id: string | number): T | null {
        return (this.indexes.get(tableName)?.get(id) as T) || null;
    }

    /** 全表遍历 */
    getAll<T = any>(tableName: string): T[] {
        return (this.tables.get(tableName) as T[]) || [];
    }

    /** 条件过滤 */
    filter<T = any>(tableName: string, predicate: (row: T) => boolean): T[] {
        return this.getAll<T>(tableName).filter(predicate);
    }

    /** 是否已加载 */
    isLoaded(tableName: string): boolean {
        return this.tables.has(tableName);
    }

    /** 清缓存（热更新 / 切场景时用） */
    clear(tableName?: string): void {
        if (tableName) {
            this.tables.delete(tableName);
            this.indexes.delete(tableName);
        } else {
            this.tables.clear();
            this.indexes.clear();
        }
    }
}
