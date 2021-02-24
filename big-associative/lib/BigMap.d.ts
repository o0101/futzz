import { AssociativeBase } from "./internal/AssociativeBase";
import { IAssociative } from "./internal/IAssociative";
import { IMap } from "./internal/IMap";
export declare class BigMap<Key, T> extends AssociativeBase<Key, T, [Key, T], Map<Key, T>> implements IAssociative<Key, T, [Key, T]>, IMap<Key, T> {
    forEach(closure: (value: T, key: Key, thisArg: this) => void): void;
    entries(): IterableIterator<[Key, T]>;
    keys(): IterableIterator<Key>;
    values(): IterableIterator<T>;
    get(key: Key): T | undefined;
    set(key: Key, value: T): this;
    protected _Create_child(): Map<Key, T>;
}
//# sourceMappingURL=BigMap.d.ts.map