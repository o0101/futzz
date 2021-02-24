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
exports.BigWeakMap = void 0;
var WeakBase_1 = require("./internal/WeakBase");
var BigWeakMap = /** @class */ (function (_super) {
    __extends(BigWeakMap, _super);
    function BigWeakMap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BigWeakMap.prototype.get = function (key) {
        var e_1, _a;
        try {
            for (var _b = __values(this.data_), _c = _b.next(); !_c.done; _c = _b.next()) {
                var container = _c.value;
                var elem = container.get(key);
                if (elem !== undefined)
                    return elem;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return undefined;
    };
    BigWeakMap.prototype.set = function (key, value) {
        return this._Insert(key, function (child) { return child.set(key, value); });
    };
    BigWeakMap.prototype._Create_child = function () {
        return new WeakMap();
    };
    return BigWeakMap;
}(WeakBase_1.WeakBase));
exports.BigWeakMap = BigWeakMap;
//# sourceMappingURL=BigWeakMap.js.map