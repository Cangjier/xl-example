// xl:title (function () { class A { m() { return this === undefined ? "u" : "o"; } } const m = new A().m; return m(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return this === undefined ? "u" : "o"; } } const m = new A().m; return m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
