"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IteratorMapper = void 0;
var Constant_1 = require("./Constant");
var IteratorMapper = /** @class */ (function () {
    function IteratorMapper(source, closure) {
        this.source_ = source;
        this.closure_ = closure;
    }
    IteratorMapper.prototype.next = function () {
        var it = this.source_.next();
        if (it.done === true)
            return Constant_1.Constant.ITERATOR_TO_END;
        return {
            done: false,
            value: this.closure_(it.value)
        };
    };
    IteratorMapper.prototype[Symbol.iterator] = function () {
        return this;
    };
    return IteratorMapper;
}());
exports.IteratorMapper = IteratorMapper;
//# sourceMappingURL=IteratorMapper.js.map