// xl:title (function () { function A() {} A.prototype.x = 1; const a = new A(); const out = []; for (const k in a) out.push(k); return out.join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function A() {} A.prototype.x = 1; const a = new A(); const out = []; for (const k in a) out.push(k); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
