// xl:title Reflect 的属性访问四格：get / set / has / deleteProperty
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

const o: any = { a: 1 };
console.log(show(Reflect.get(o, "a")) + "|" + show(Reflect.has(o, "a")) + "|" + show(Reflect.set(o, "b", 2)) + "|" + show(o.b));
console.log(show(Reflect.deleteProperty(o, "a")) + "|" + show(Reflect.has(o, "a")) + "|" + show(Reflect.deleteProperty({}, "zz")));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const proto: any = { p: 1 };
const o: any = Object.create(proto);
console.log(show(Reflect.get(o, "p")) + "|" + show(Reflect.has(o, "p")) + "|" + show(Reflect.get(o, "q")));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
Object.defineProperty(o, "x", { value: 1, writable: false });
console.log(show(Reflect.set(o, "x", 2)) + "|" + show(o.x) + "|" + show(t(() => { o.x = 3; return o.x; })));
})();
