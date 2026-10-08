// xl:title (function () { let n = 0; for (const x of [1, 2, 3]) { if (x === 2) break; n++; } return n; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; for (const x of [1, 2, 3]) { if (x === 2) break; n++; } return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
