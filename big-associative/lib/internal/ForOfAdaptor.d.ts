export declare class ForOfAdaptor<T> implements IterableIterator<T> {
    private data_;
    private index_;
    private source_;
    constructor(data: ISource<T>[]);
    next(): IteratorResult<T>;
    [Symbol.iterator](): IterableIterator<T>;
}
interface ISource<T> {
    [Symbol.iterator](): IterableIterator<T>;
}
export {};
//# sourceMappingURL=ForOfAdaptor.d.ts.map