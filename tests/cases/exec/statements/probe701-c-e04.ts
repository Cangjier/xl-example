// xl:title (function () { let s = ''; for (let i = 0; i < 3; i++) { if (i === 1) continue; s += i; } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; for (let i = 0; i < 3; i++) { if (i === 1) continue; s += i; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
