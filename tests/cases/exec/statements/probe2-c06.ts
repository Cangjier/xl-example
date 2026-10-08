// xl:title (function () { let out = ""; for (const k in { a: 1, b: 2 }) { out += k; } return out; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; for (const k in { a: 1, b: 2 }) { out += k; } return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
