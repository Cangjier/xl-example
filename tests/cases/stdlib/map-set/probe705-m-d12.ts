// xl:title (function () { let n = 0; new Map([[1, 2]]).forEach(() => { n++; }); return n; })()
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; new Map([[1, 2]]).forEach(() => { n++; }); return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
