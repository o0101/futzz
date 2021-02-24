export declare type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};
export declare function Writable<T>(elem: T): Writable<T>;
//# sourceMappingURL=Writable.d.ts.map