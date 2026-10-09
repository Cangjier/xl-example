// xl:title 成员调用落在空值接收者上（第 772 轮收掉，这里当守卫）
// xl:round 771
// xl:judge stdout
// xl:end
// **第 771 轮登记的那条缺口已在第 772 轮收掉**（`vm.xl.md` 的 `DoCallMethod`：
// `Guard` 展开之后不再往下调 `DoCallValue`），`xl:want blocked` / `xl:why` 按规矩撤掉，
// 这一条留着当守卫——它钉的是「`u.x` 那一读抛得出来、紧接着那次调用也落在脚本的 `try` 里」。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (function () { const u: any = undefine', show(() => (function () { const u: any = undefined; return u.x(); })()));
console.log('02 (function () { const n: any = null; re', show(() => (function () { const n: any = null; return n.x(); })()));
console.log('03 (function () { const u: any = undefine', show(() => (function () { const u: any = undefined; return u.x.y(); })()));
