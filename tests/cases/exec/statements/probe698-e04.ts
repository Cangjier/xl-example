// xl:title (function () { let out = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) continue; out += i; } finally { out += "f"; } } return out; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; for (let i = 0; i < 3; i++) { try { if (i === 1) continue; out += i; } finally { out += "f"; } } return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
