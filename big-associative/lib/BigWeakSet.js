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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigWeakSet = void 0;
var WeakBase_1 = require("./internal/WeakBase");
var BigWeakSet = /** @class */ (function (_super) {
    __extends(BigWeakSet, _super);
    function BigWeakSet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BigWeakSet.prototype.add = function (key) {
        return this._Insert(key, function (child) { return child.add(key); });
    };
    BigWeakSet.prototype._Create_child = function () {
        return new WeakSet();
    };
    return BigWeakSet;
}(WeakBase_1.WeakBase));
exports.BigWeakSet = BigWeakSet;
//# sourceMappingURL=BigWeakSet.js.map