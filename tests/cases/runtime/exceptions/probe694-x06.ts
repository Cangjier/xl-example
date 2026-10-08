// xl:title (function () { let s = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) break; s += i; } finally { s += "f"; } } return s; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) break; s += i; } finally { s += "f"; } } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
