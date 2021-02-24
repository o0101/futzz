import { AssociativeBase } from "./internal/AssociativeBase";
import { IAssociative } from "./internal/IAssociative";
import { ISet } from "./internal/ISet";
export declare class BigSet<Key> extends AssociativeBase<Key, Key, Key, Set<Key>> implements IAssociative<Key, Key, Key>, ISet<Key> {
    forEach(closure: (value: Key, key: Key, thisArg: this) => void): void;
    entries(): IterableIterator<[Key, Key]>;
    keys(): IterableIterator<Key>;
    values(): IterableIterator<Key>;
    add(key: Key): this;
    protected _Create_child(): Set<Key>;
}
//# sourceMappingURL=BigSet.d.ts.map