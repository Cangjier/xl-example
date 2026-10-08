// xl:title 不可配置的访问器：同一对 `get` / `set` 重写是允许的
// xl:round 691
// xl:judge stdout
// xl:end
const getter = function () { return 3; };
const o: any = {};
Object.defineProperty(o, "g", { get: getter, configurable: false });
Object.defineProperty(o, "g", { get: getter });
console.log(o.g);
try { Object.defineProperty(o, "g", { get() { return 4; } }); console.log("new ok"); } catch (e: any) { console.log("new", e.constructor.name); }
