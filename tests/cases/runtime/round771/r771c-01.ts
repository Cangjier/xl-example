// xl:title 成员调用落在空值接收者上：整份脚本被带走
// xl:round 771
// xl:judge stdout
// xl:want blocked
// xl:why `u.x()`（`u` 是 `undefined` / `null`）在 JS 里是 `TypeError`、**脚本自己接得住**；本仓整份脚本被引擎带走（`cannot call a non-closure value`，退出码 1、后面的行一行都不打印）——`u.x` 那一读抛得出来，紧接着那次调用却落在脚本的 `try` **外面**。判据这一档是 `blocked`（不是 `differ`）：**这条用例在本仓根本跑不完**，比不出 stdout
// xl:end
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
