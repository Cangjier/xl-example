// xl:title (function () { let s = ''; do { s += 'x'; break; } while (true); return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; do { s += 'x'; break; } while (true); return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
