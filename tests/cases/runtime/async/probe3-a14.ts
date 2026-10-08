// xl:title (function () { return Promise.resolve(Promise.resolve(1)) instanceof Promise; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return Promise.resolve(Promise.resolve(1)) instanceof Promise; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
