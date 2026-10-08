// xl:title `Math` 的实参强制转换与 `-0` / `NaN` 的传播
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
console.log('Math.max("1" as any, 2)', show(() => Math.max("1" as any, 2)));
console.log('Math.abs("-1" as any)', show(() => Math.abs("-1" as any)));
console.log('Math.pow(2, "3" as any)', show(() => Math.pow(2, "3" as any)));
console.log('Math.round("1.5" as any)', show(() => Math.round("1.5" as any)));
console.log('Math.max(0, -0)', show(() => Math.max(0, -0)));
console.log('1 / Math.max(-0, -0)', show(() => 1 / Math.max(-0, -0)));
