// xl:title (function () { class A { m({ a }) { return a; } } return new A().m({ a: 1 }); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m({ a }) { return a; } } return new A().m({ a: 1 }); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
