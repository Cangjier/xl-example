// xl:title (function () { try { return typeof x; let x = 1; } catch (e) { return e.constructor.name; } })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `typeof x` 写在 `let x` **之前**该抛 `ReferenceError`（TDZ），本仓给 `"undefined"`——降级层判「这个名字在不在作用域链上」时看的是**声明有没有走到**（第 149 轮 `NameIsUnreachable` 那一支，说明里写着「TDZ 那一档是本仓已经记着的缺口」）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { return typeof x; let x = 1; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
