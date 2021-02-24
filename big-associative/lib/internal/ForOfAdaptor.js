"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForOfAdaptor = void 0;
var ForOfAdaptor = /** @class */ (function () {
    function ForOfAdaptor(data) {
        this.data_ = data;
        this.index_ = 0;
        this.source_ = this.data_[0][Symbol.iterator]();
    }
    ForOfAdaptor.prototype.next = function () {
        // ALL COMPLETED
        if (this.source_ === null)
            return ITERATOR_END;
        // STEP TO THE NEXT
        var it = this.source_.next();
        if (it.done === true)
            if (++this.index_ === this.data_.length) {
                // REACHED TO THE END
                this.source_ = null;
                return ITERATOR_END;
            }
            else {
                // SELECT THE NEXT MAP
                this.source_ = this.data_[this.index_][Symbol.iterator]();
                it = this.source_.next();
            }
        return it;
    };
    ForOfAdaptor.prototype[Symbol.iterator] = function () {
        return this;
    };
    return ForOfAdaptor;
}());
exports.ForOfAdaptor = ForOfAdaptor;
var ITERATOR_END = { done: true, value: undefined };
//# sourceMappingURL=ForOfAdaptor.js.map