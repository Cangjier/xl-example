// xl:title (function () { const s = "ab"; return ["0" in Object(s), 2 in Object(s)].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = "ab"; return ["0" in Object(s), 2 in Object(s)].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
