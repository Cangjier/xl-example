// xl:title (function () { const out = []; Promise.resolve().then(() => out.push(1)); out.push(0); return out.join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const out = []; Promise.resolve().then(() => out.push(1)); out.push(0); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
