// xl:title `__proto__` 赋值与对象字面量里的 `__proto__` 收到非对象值时不抛、原型不动
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => { const o: any = {}; o.__proto__ = 1; return Object.getPrototypeOf(o) === Object.prototype; }));
console.log(t(() => { const o: any = { __proto__: 1 }; return Object.getPrototypeOf(o) === Object.prototype; }));
