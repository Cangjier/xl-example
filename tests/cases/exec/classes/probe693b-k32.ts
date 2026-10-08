// xl:title (function () { class A { m() { return super.toString ? "has" : "no"; } } return new A().m(); })()（第 742 轮收掉）
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return super.toString ? "has" : "no"; } } return new A().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
