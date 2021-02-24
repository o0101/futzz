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
var EXTENSION = __filename.substr(-2);
if (EXTENSION === "js")
    require("source-map-support").install();
var BigMap_1 = require("../BigMap");
var Constant_1 = require("../internal/Constant");
var Writable_1 = require("./internal/Writable");
var LENGTH = 50;
function small_test(capacity, closure) {
    var original = Constant_1.Constant.MAX_CAPACITY;
    Writable_1.Writable(Constant_1.Constant).MAX_CAPACITY = capacity;
    {
        closure();
    }
    Writable_1.Writable(Constant_1.Constant).MAX_CAPACITY = original;
}
function main() {
    small_test(10, function () {
        var e_1, _a, e_2, _b;
        // TEST ADD
        var map = new BigMap_1.BigMap();
        for (var i = 0; i < LENGTH; ++i)
            map.set(i, i);
        // TEST SIZE
        if (map.size !== LENGTH)
            throw new Error("Error on BigMap.size: not " + LENGTH + " but " + map.size + ".");
        // TEST FOR OF ITERATION
        var count = 0;
        try {
            for (var map_1 = __values(map), map_1_1 = map_1.next(); !map_1_1.done; map_1_1 = map_1.next()) {
                var _c = map_1_1.value;
                ++count;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (map_1_1 && !map_1_1.done && (_a = map_1.return)) _a.call(map_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (count !== LENGTH)
            throw new Error("Error on BigMap[Symbol.iterator](): number of iterations are not " + LENGTH + " but " + count + ".");
        // TEST DELETE
        var erased = 0;
        for (var i = 0; i < LENGTH; ++i)
            if (Math.random() < .5) {
                ++erased;
                map.delete(i);
            }
        if (erased !== LENGTH - map.size)
            throw new Error("Error on BigMap.delete: not " + erased + " but " + (LENGTH - map.size));
        // FOR OF ITERATION AGAIN AFTER THE DELETION
        count = 0;
        try {
            for (var map_2 = __values(map), map_2_1 = map_2.next(); !map_2_1.done; map_2_1 = map_2.next()) {
                var _d = map_2_1.value;
                ++count;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (map_2_1 && !map_2_1.done && (_b = map_2.return)) _b.call(map_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (count !== map.size)
            throw new Error("Error on BigMap[Symbol.iterator]() after deletion: number of iterations are not " + map.size + " but " + count + ".");
    });
}
main();
//# sourceMappingURL=index.js.map