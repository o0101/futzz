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
exports.BigMap = void 0;
var AssociativeBase_1 = require("./internal/AssociativeBase");
var IteratorMapper_1 = require("./internal/IteratorMapper");
var BigMap = /** @class */ (function (_super) {
    __extends(BigMap, _super);
    function BigMap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* -----------------------------------------------------------
        ITERATORS
    ----------------------------------------------------------- */
    BigMap.prototype.forEach = function (closure) {
        var e_1, _a;
        try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tuple = _c.value;
                closure(tuple[1], tuple[0], this);
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
    BigMap.prototype.entries = function () {
        return this[Symbol.iterator]();
    };
    BigMap.prototype.keys = function () {
        return new IteratorMapper_1.IteratorMapper(this[Symbol.iterator](), function (tuple) { return tuple[0]; });
    };
    BigMap.prototype.values = function () {
        return new IteratorMapper_1.IteratorMapper(this[Symbol.iterator](), function (tuple) { return tuple[1]; });
    };
    /* -----------------------------------------------------------
        CONSTRUCTORS
    ----------------------------------------------------------- */
    BigMap.prototype.get = function (key) {
        var e_2, _a;
        try {
            for (var _b = __values(this.data_), _c = _b.next(); !_c.done; _c = _b.next()) {
                var container = _c.value;
                var elem = container.get(key);
                if (elem !== undefined)
                    return elem;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return undefined;
    };
    BigMap.prototype.set = function (key, value) {
        return this._Insert(key, function (child) { 
          try {
            return child.set(key, value); 
          } catch(e) {
            console.log("Cannot insert", "Child size", child.size, key, value);
            throw e;
          }
        });
    };
    BigMap.prototype._Create_child = function () {
        return new Map();
    };
    return BigMap;
}(AssociativeBase_1.AssociativeBase));
exports.BigMap = BigMap;
//# sourceMappingURL=BigMap.js.map
