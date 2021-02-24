import { WeakBase } from "./internal/WeakBase";
import { IWeak } from "./internal/IWeak";
import { ISet } from "./internal/ISet";
export declare class BigWeakSet<Key extends object> extends WeakBase<Key, WeakSet<Key>> implements IWeak<Key>, ISet<Key> {
    add(key: Key): this;
    protected _Create_child(): WeakSet<Key>;
}
//# sourceMappingURL=BigWeakSet.d.ts.map