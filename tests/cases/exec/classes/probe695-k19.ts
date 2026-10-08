// xl:title (function () { class A { m() { return this === undefined ? "u" : "o"; } } const f = new A().m; return f(); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return this === undefined ? "u" : "o"; } } const f = new A().m; return f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
