// xl:title 全局对象 / `Math` / `JSON` / `Reflect` 的 `Symbol.toStringTag`
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(globalThis)));
console.log('(globalThis as any)[Symbol.toS', show(() => (globalThis as any)[Symbol.toStringTag]));
console.log('JSON.stringify(Object.getOwnPr', show(() => JSON.stringify(Object.getOwnPropertyDescriptor(globalThis, Symbol.toStringTag))));
console.log('(function (this: any) { return', show(() => (function (this: any) { return Object.prototype.toString.call(this); }).call(null)));
console.log('(function (this: any) { return', show(() => (function (this: any) { return this === globalThis; }).call(undefined)));
console.log('(function (this: any) { return', show(() => (function (this: any) { return (this as any)[Symbol.toStringTag]; }).call(null)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Math)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(JSON)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Reflect)));
console.log('typeof Reflect.get', show(() => typeof Reflect.get));
console.log('typeof Reflect.ownKeys', show(() => typeof Reflect.ownKeys));
console.log('Object.keys(Math).length', show(() => Object.keys(Math).length));
console.log('Object.keys(JSON).length', show(() => Object.keys(JSON).length));
console.log('Object.keys(Reflect).length', show(() => Object.keys(Reflect).length));
console.log('(Math as any)[Symbol.toStringT', show(() => (Math as any)[Symbol.toStringTag]));
console.log('(JSON as any)[Symbol.toStringT', show(() => (JSON as any)[Symbol.toStringTag]));
console.log('(Reflect as any)[Symbol.toStri', show(() => (Reflect as any)[Symbol.toStringTag]));
