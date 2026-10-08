// xl:title 对象字面量：简写、计算键、方法、访问器、`__proto__`、展开
// xl:round 753
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('({ a: 1, b: 2 })', show(() => ({ a: 1, b: 2 })));
console.log('(function () { const a = 1; re', show(() => (function () { const a = 1; return { a }; })()));
console.log('({ ["k" + 1]: 1 })', show(() => ({ ["k" + 1]: 1 })));
console.log('({ m() { return 1; } }).m()', show(() => ({ m() { return 1; } }).m()));
console.log('({ get g() { return 1; } }).g', show(() => ({ get g() { return 1; } }).g));
console.log('({ __proto__: { z: 1 } }).z', show(() => ({ __proto__: { z: 1 } }).z));
console.log('Object.getPrototypeOf({ __prot', show(() => Object.getPrototypeOf({ __proto__: { z: 1 } })));
console.log('({ ["__proto__"]: { z: 1 } }).', show(() => ({ ["__proto__"]: { z: 1 } }).z));
console.log('({ ...{ a: 1 }, b: 2 })', show(() => ({ ...{ a: 1 }, b: 2 })));
console.log('Object.keys({ 2: "a", 1: "b", ', show(() => Object.keys({ 2: "a", 1: "b", x: "c" })));
console.log('Object.getOwnPropertyNames({ b', show(() => Object.getOwnPropertyNames({ b: 1, a: 2 })));
console.log('JSON.stringify({ m() { return ', show(() => JSON.stringify({ m() { return 1; } })));
