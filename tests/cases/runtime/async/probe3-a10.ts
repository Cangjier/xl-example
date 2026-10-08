// xl:title (function () { let n = 0; const p = new Promise((res) => { n = 1; res(2); }); return n; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; const p = new Promise((res) => { n = 1; res(2); }); return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
