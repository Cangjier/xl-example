// xl:title `JSON` 那两个入口的实参与值
// xl:round 771
// xl:judge stdout
// xl:want differ
// xl:why 两个根：`JSON.stringify(Symbol())` 在 JS 里给 `undefined`（符号不可序列化、**不抛**），本仓抛 `TypeError`；`JSON.parse(1)` 在 JS 里先把实参 `ToString`（`"1"` ⇒ `1`），本仓直接解析整数、抛 `SyntaxError`
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (JSON.stringify as any)(Symbol(\'s\'))', show(() => (JSON.stringify as any)(Symbol('s'))));
console.log('02 (JSON.parse as any)(1)', show(() => (JSON.parse as any)(1)));
console.log('03 (JSON.stringify as any)({ a: undefined', show(() => (JSON.stringify as any)({ a: undefined })));
console.log('04 (JSON.stringify as any)(function () {}', show(() => (JSON.stringify as any)(function () {})));
