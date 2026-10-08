// xl:title (function () { function* g() { yield 1; yield 2; } const out = []; for (const v of g()) { out.push(v); if (v === 1) break; } return out.join(","); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; yield 2; } const out = []; for (const v of g()) { out.push(v); if (v === 1) break; } return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
