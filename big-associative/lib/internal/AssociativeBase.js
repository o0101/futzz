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
exports.AssociativeBase = void 0;
var ForOfAdaptor_1 = require("./ForOfAdaptor");
var WeakBase_1 = require("./WeakBase");
var AssociativeBase = /** @class */ (function (_super) {
    __extends(AssociativeBase, _super);
    function AssociativeBase() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AssociativeBase.prototype[Symbol.iterator] = function () {
        return new ForOfAdaptor_1.ForOfAdaptor(this.data_);
    };
    return AssociativeBase;
}(WeakBase_1.WeakBase));
exports.AssociativeBase = AssociativeBase;
//# sourceMappingURL=AssociativeBase.js.map