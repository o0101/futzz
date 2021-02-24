"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.BigSet = void 0;
var AssociativeBase_1 = require("./internal/AssociativeBase");
var IteratorMapper_1 = require("./internal/IteratorMapper");
var BigSet = /** @class */ (function (_super) {
    __extends(BigSet, _super);
    function BigSet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* -----------------------------------------------------------
        ITERATORS
    ----------------------------------------------------------- */
    BigSet.prototype.forEach = function (closure) {
        var e_1, _a;
        try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
                var key = _c.value;
                closure(key, key, this);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    BigSet.prototype.entries = function () {
        return new IteratorMapper_1.IteratorMapper(this[Symbol.iterator](), function (key) { return [key, key]; });
    };
    BigSet.prototype.keys = function () {
        return this[Symbol.iterator]();
    };
    BigSet.prototype.values = function () {
        return this[Symbol.iterator]();
    };
    /* -----------------------------------------------------------
        CONSTRUCTORS
    ----------------------------------------------------------- */
    BigSet.prototype.add = function (key) {
        return this._Insert(key, function (child, duplicate) {
            if (duplicate === false)
                child.add(key);
        });
    };
    BigSet.prototype._Create_child = function () {
        return new Set();
    };
    return BigSet;
}(AssociativeBase_1.AssociativeBase));
exports.BigSet = BigSet;
//# sourceMappingURL=BigSet.js.map