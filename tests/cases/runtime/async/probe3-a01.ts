// xl:title (function () { const seen = []; Promise.resolve(1).then((v) => seen.push(v)); seen.push(0); return seen.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const seen = []; Promise.resolve(1).then((v) => seen.push(v)); seen.push(0); return seen.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
