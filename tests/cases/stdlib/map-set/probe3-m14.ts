// xl:title (function () { const m = new Map([["a", 1], ["b", 2]]); const out = []; for (const [k, v] of m) out.push(k + v); return out.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1], ["b", 2]]); const out = []; for (const [k, v] of m) out.push(k + v); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
