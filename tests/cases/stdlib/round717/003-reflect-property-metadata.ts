// xl:title Reflect 的属性元信息：ownKeys / getOwnPropertyDescriptor / defineProperty
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

const k = Symbol("k");
const o: any = { b: 1, 2: 2, 1: 1, [k]: 3 };
console.log(show(Reflect.ownKeys(o).map((x: any) => typeof x === "symbol" ? "sym" : x).join(",")));
console.log(show(Reflect.ownKeys([1, 2]).join(",")));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { a: 1 };
console.log(show(JSON.stringify(Reflect.getOwnPropertyDescriptor(o, "a"))) + "|" + show(Reflect.getOwnPropertyDescriptor(o, "z")));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(show(Reflect.defineProperty(o, "a", { value: 1 })) + "|" + show(JSON.stringify(Object.keys(o))) + "|" + show(o.a));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(show(Reflect.defineProperty(o, "a", { value: 1 })) + "|" + show(typeof Object.defineProperty(o, "b", { value: 2 })));
})();
