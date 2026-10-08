// xl:title (function () { const f = () => () => ({ v: 1 }); return f()().v; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = () => () => ({ v: 1 }); return f()().v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
