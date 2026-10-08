// xl:title (function () { const out = []; for (const k in { a: 1 }) out.push(k); return out.join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const out = []; for (const k in { a: 1 }) out.push(k); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
