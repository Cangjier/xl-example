// xl:title 成员调用落在空值接收者上：脚本自己接得住
// xl:round 772
// xl:judge stdout
// xl:end
// 第 771 轮登记的 `runtime/round771/r771c-01` 在这一轮收掉了：
// `u.x` 那一读抛得出来，而紧接着那次调用原来落在脚本的 `try` **外面**
//（`DoCallMethod` 在 `Guard` 已经展开之后照旧往下调 `DoCallValue`）。
// **第 809 轮把 `runtime/round771/r771c-01` 并了进来**（同一个判定点在两个域里各写了一遍：
// 它只有三行，都是这一条的 01 / 02 / 03 的最小形态）——它独有的**变量接收者**那两行接在下面。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (undefined).x()', show(() => (undefined as any).x()));
console.log('02 (null).x()', show(() => (null as any).x()));
console.log('03 (undefined).x.y()', show(() => (undefined as any).x.y()));
console.log('04 (undefined)[0]()', show(() => (undefined as any)[0]()));
console.log('05 (null).toString()', show(() => (null as any).toString()));
const u: any = undefined;
console.log('06 u.x()', show(() => u.x()));
console.log('07 u?.x()', show(() => u?.x()));
console.log('08 u.x.y.z()', show(() => u.x.y.z()));
console.log('09 之后的语句照旧', show(() => "after"));
console.log('10 原始值接收者照旧', show(() => (1 as any).x()));
// 809 · 原 runtime/round771/r771c-01（变量接收者的那两行最小形态）
console.log('11 变量接收者', show(() => (function () { const u: any = undefined; return u.x(); })()));
console.log('12 变量接收者（嵌套链）', show(() => (function () { const u: any = undefined; return u.x.y(); })()));
