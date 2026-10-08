// xl:title (function () { const out = []; for (const k in { 2: 1, 1: 2, a: 3 }) out.push(k); return out.join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const out = []; for (const k in { 2: 1, 1: 2, a: 3 }) out.push(k); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
