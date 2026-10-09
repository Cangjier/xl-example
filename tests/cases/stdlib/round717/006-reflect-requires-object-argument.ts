// xl:title Reflect 不替原始值开箱（Object 同名那几格开箱）
// xl:round 717
// xl:judge stdout
// xl:want pass
// xl:end
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Reflect.get(1 as any, "x")) + "|" + t(() => Reflect.ownKeys(null as any)) + "|" + t(() => Reflect.has("ab" as any, 0)));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(show(Object.getPrototypeOf(1) === Number.prototype) + "|" + show(Object.isExtensible(1)) + "|" + t(() => Reflect.isExtensible(1 as any)));
})();
