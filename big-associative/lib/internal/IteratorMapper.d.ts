export declare class IteratorMapper<From, To> implements IterableIterator<To> {
    private source_;
    private closure_;
    constructor(source: IterableIterator<From>, closure: (from: From) => To);
    next(): IteratorResult<To>;
    [Symbol.iterator](): IterableIterator<To>;
}
//# sourceMappingURL=IteratorMapper.d.ts.map