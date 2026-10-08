// xl:title (function () { try { Object.setPrototypeOf({}, 1); return "no"; } catch (e) { return e.constructor.name; } })()
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why `Object.setPrototypeOf({}, 1)` 在 Node 里抛 `TypeError`，本仓**静默不做事**——这是第 278 轮**故意**选的口径：`class E extends Error {}` 的父类是**宿主引用值**，`RtSetProto` 那一格收到非对象原型时若改成抛，会把一条完全合法的 `extends` 挡住（当时实测红两条）。**要收这一格得先把「内建构造函数得是个真对象」补上**（它没有属性表，`Error.prototype` 取不出来），记在这里。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { Object.setPrototypeOf({}, 1); return "no"; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
