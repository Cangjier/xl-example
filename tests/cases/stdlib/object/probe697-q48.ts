// xl:title (function () { const o = JSON.parse('{"a":1}', (k, v) => v); return o.a; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = JSON.parse('{"a":1}', (k, v) => v); return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
