// xl:title `Array.from` / 展开：类数组、可迭代、映射器与 `thisArg`
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
console.log('Array.from({ length: 2, ', show(() => Array.from({ length: 2, 0: "a" })));
console.log('Array.from({ length: 2, ', show(() => Array.from({ length: 2, 0: "a" }, (v) => v)));
console.log('Array.from(new Set([1, 2', show(() => Array.from(new Set([1, 2]))));
console.log('Array.from("ab")', show(() => Array.from("ab")));
console.log('Array.from(1 as any)', show(() => Array.from(1 as any)));
console.log('[...({ length: 2, 0: "a"', show(() => [...({ length: 2, 0: "a" } as any)]));
