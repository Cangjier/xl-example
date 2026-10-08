// xl:title 字符串方法的实参强制转换：`includes` / `indexOf` / `concat` 收对象与缺实参
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
console.log('"ab".includes({ toString', show(() => "ab".includes({ toString() { return "b"; } })));
console.log('"ab".includes()', show(() => "ab".includes()));
console.log('"ab".indexOf({ toString(', show(() => "ab".indexOf({ toString() { return "b"; } })));
console.log('"ab".concat({ toString()', show(() => "ab".concat({ toString() { return "T"; } })));
console.log('"ab".startsWith()', show(() => "ab".startsWith()));
console.log('"ab".endsWith()', show(() => "ab".endsWith()));
