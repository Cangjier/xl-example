// xl:title 描述符自己的两条合法性：`get` 必须是函数、数据与访问器两族不能混
// xl:round 752
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
console.log('Object.defineProperty({}, "a", { value: 1 })', show(() => Object.defineProperty({}, "a", { value: 1 })));
console.log('Object.defineProperty(Object.freeze({ a: 1 }), "a", { value: 2 })', show(() => Object.defineProperty(Object.freeze({ a: 1 }), "a", { value: 2 })));
console.log('Object.defineProperty({}, "a", { get: 1 })', show(() => Object.defineProperty({}, "a", { get: 1 })));
console.log('Object.defineProperty({}, "a", { get() { return 1; }, value: 2 })', show(() => Object.defineProperty({}, "a", { get() { return 1; }, value: 2 })));
