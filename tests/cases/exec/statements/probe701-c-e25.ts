// xl:title (function () { let s = ''; const arr = [1, 2, 3]; arr.forEach((v, i) => { if (i === 1) return; s += v; }); return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; const arr = [1, 2, 3]; arr.forEach((v, i) => { if (i === 1) return; s += v; }); return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
