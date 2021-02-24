import { IAssociative } from "./IAssociative";
import { WeakBase } from "./WeakBase";
export declare abstract class AssociativeBase<Key, T, Elem, Child extends IAssociative<Key, T, Elem>> extends WeakBase<Key, Child> implements IAssociative<Key, T, Elem> {
    abstract forEach(closure: (value: T, key: Key, thisArg: this) => void): void;
    abstract entries(): IterableIterator<[Key, T]>;
    abstract keys(): IterableIterator<Key>;
    abstract values(): IterableIterator<T>;
    [Symbol.iterator](): IterableIterator<Elem>;
}
//# sourceMappingURL=AssociativeBase.d.ts.map