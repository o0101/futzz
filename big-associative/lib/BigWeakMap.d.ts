import { WeakBase } from "./internal/WeakBase";
import { IWeak } from "./internal/IWeak";
import { IMap } from "./internal/IMap";
export declare class BigWeakMap<Key extends object, T> extends WeakBase<Key, WeakMap<Key, T>> implements IWeak<Key>, IMap<Key, T> {
    get(key: Key): T | undefined;
    set(key: Key, value: T): this;
    protected _Create_child(): WeakMap<Key, T>;
}
//# sourceMappingURL=BigWeakMap.d.ts.map