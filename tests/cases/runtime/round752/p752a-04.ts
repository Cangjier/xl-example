// xl:title `Map` / `Set` 的构造与相等：`NaN` / `-0` / 对象身份 / 非法实参
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
console.log('new Map([[NaN, 1]]).get(', show(() => new Map([[NaN, 1]]).get(NaN)));
console.log('new Map([[0, 1]]).get(-0', show(() => new Map([[0, 1]]).get(-0)));
console.log('new Set([NaN, NaN]).size', show(() => new Set([NaN, NaN]).size));
console.log('new Set([-0, 0]).size', show(() => new Set([-0, 0]).size));
console.log('new Map([[{}, 1]]).size', show(() => new Map([[{}, 1]]).size));
console.log('new Map(1 as any)', show(() => new Map(1 as any)));
