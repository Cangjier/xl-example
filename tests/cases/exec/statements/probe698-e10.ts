// xl:title (function () { let out = []; for (const k of [1, 2]) { try { if (k === 1) continue; out.push(k); } finally { out.push("f"); } } return out.join(","); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = []; for (const k of [1, 2]) { try { if (k === 1) continue; out.push(k); } finally { out.push("f"); } } return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
