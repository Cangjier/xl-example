// xl:title `Symbol` 接收者与原始值装箱
// xl:round 771
// xl:judge stdout
// xl:want differ
// xl:why 本仓没有符号包装对象、`Object.prototype.valueOf` 对原始值也不装箱：`Object.keys(Symbol())` 该给 `[]`（`ToObject` 出一个 Symbol 包装对象）、`Object.getPrototypeOf(Symbol())` 该给 `Symbol.prototype`、`Object.prototype.valueOf.call('x')` 该给一个 **String 包装对象**——三处本仓都抛 / 原样交回
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 Object.keys(Symbol(\'s\') as any)', show(() => Object.keys(Symbol('s') as any)));
console.log('02 Object.getOwnPropertyNames(Symbol(\'s\')', show(() => Object.getOwnPropertyNames(Symbol('s') as any)));
console.log('03 typeof Object.getPrototypeOf(Symbol(\'s', show(() => typeof Object.getPrototypeOf(Symbol('s'))));
console.log('04 Object.getOwnPropertyDescriptor(Symbol', show(() => Object.getOwnPropertyDescriptor(Symbol('s') as any, 'description')));
console.log('05 JSON.stringify(Symbol(\'s\'))', show(() => JSON.stringify(Symbol('s'))));
console.log('06 (Object.prototype.valueOf as any).call', show(() => (Object.prototype.valueOf as any).call('x')));
console.log('07 (Object.prototype.valueOf as any).call', show(() => (Object.prototype.valueOf as any).call(1)));
