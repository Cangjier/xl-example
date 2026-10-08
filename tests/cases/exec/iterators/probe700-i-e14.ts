// xl:title (function () { const it = [1, 2, 3].entries(); return it.next().value.join(':'); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = [1, 2, 3].entries(); return it.next().value.join(':'); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
