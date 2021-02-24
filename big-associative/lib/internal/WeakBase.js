"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeakBase = void 0;
var Constant_1 = require("./Constant");
var WeakBase = /** @class */ (function () {
    /* -----------------------------------------------------------
        CONSTRUCTORS
    ----------------------------------------------------------- */
    function WeakBase() {
        this.data_ = [this._Create_child()];
        this.size_array_ = [0];
        this.size_ = 0;
    }
    WeakBase.prototype.clear = function () {
        this.data_ = [this._Create_child()];
        this.size_array_ = [0];
        this.size_ = 0;
    };
    Object.defineProperty(WeakBase.prototype, "size", {
        /* -----------------------------------------------------------
            ACCESSORS
        ----------------------------------------------------------- */
        get: function () {
            return this.size_;
        },
        enumerable: false,
        configurable: true
    });
    WeakBase.prototype.has = function (key) {
        var e_1, _a;
        try {
            for (var _b = __values(this.data_), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                if (child.has(key) === true)
                    return true;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    WeakBase.prototype._Insert = function (key, closure) {
        var e_2, _a;
        try {
            // DUPLICATED KEY EXISTS?
            for (var _b = __values(this.data_), _c = _b.next(); !_c.done; _c = _b.next()) {
                var cont = _c.value;
                if (cont.has(key) === true) {
                    closure(cont, true);
                    return this;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // PICK THE TARGET CONTAINER
        var index = this.size_array_.length - 1;
        if (this.size_array_[index] >= Constant_1.Constant.MAX_CAPACITY) {
            this.data_.push(this._Create_child());
            this.size_array_.push(0);
            ++index;
        }
        // DO INSERT
        closure(this.data_[index], false);
        ++this.size_array_[index];
        ++this.size_;
        return this;
    };
    WeakBase.prototype.delete = function (key) {
        for (var i = 0; i < this.data_.length; ++i)
            if (this.data_[i].delete(key) === true) {
                if (--this.size_array_[i] === 0) {
                    this.data_.splice(i, 0);
                    this.size_array_.splice(i, 0);
                }
                --this.size_;
                return true;
            }
        return false;
    };
    return WeakBase;
}());
exports.WeakBase = WeakBase;
//# sourceMappingURL=WeakBase.js.map