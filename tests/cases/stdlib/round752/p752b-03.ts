// xl:title `JSON.stringify` 的边界：`undefined` / 函数 / 符号 / 循环 / `toJSON`
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
console.log('JSON.stringify(undefined', show(() => JSON.stringify(undefined)));
console.log('JSON.stringify(() => 1)', show(() => JSON.stringify(() => 1)));
console.log('JSON.stringify([undefine', show(() => JSON.stringify([undefined, () => 1])));
console.log('JSON.stringify({ a: unde', show(() => JSON.stringify({ a: undefined, b: () => 1 })));
console.log('JSON.stringify({ toJSON(', show(() => JSON.stringify({ toJSON() { return 7; } })));
console.log('JSON.stringify(NaN)', show(() => JSON.stringify(NaN)));
