import { IWeak } from "./IWeak";
export declare abstract class WeakBase<Key, Child extends IWeak<Key>> {
    protected data_: Child[];
    private size_array_;
    private size_;
    constructor();
    clear(): void;
    protected abstract _Create_child(): Child;
    get size(): number;
    has(key: Key): boolean;
    protected _Insert(key: Key, closure: (child: Child, duplicate: boolean) => void): this;
    delete(key: Key): boolean;
}
//# sourceMappingURL=WeakBase.d.ts.map