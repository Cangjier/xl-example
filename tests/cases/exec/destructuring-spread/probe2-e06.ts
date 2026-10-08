// xl:title (function () { const f = ({ a = 1 } = {}) => a; return f() + "," + f({ a: 5 }); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = ({ a = 1 } = {}) => a; return f() + "," + f({ a: 5 }); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
