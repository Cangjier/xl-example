// xl:title 数组的数值实参：`slice` / `at` / `fill` 收字符串与对象
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
console.log('[1,2,3].slice(true)', show(() => [1,2,3].slice(true)));
console.log('[1,2,3].at(true)', show(() => [1,2,3].at(true)));
console.log('[1,2,3].fill(9, true)', show(() => [1,2,3].fill(9, true)));
console.log('[1,2,3].slice({ valueOf(', show(() => [1,2,3].slice({ valueOf() { return 1; } })));
console.log('[1,2,3].includes(2, true', show(() => [1,2,3].includes(2, true)));
console.log('[1,2,3].indexOf(2, { val', show(() => [1,2,3].indexOf(2, { valueOf() { return 1; } })));
