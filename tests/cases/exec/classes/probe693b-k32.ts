// xl:title (function () { class A { m() { return super.toString ? "has" : "no"; } } return new A().m(); })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `super.toString`（父类**没有**写、要一路走到 `Object.prototype`）本仓给 `undefined`（JS 给那个函数）：`super` 取属性时只看了**父类自己的**那一格，没有再往上走原型链。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return super.toString ? "has" : "no"; } } return new A().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
