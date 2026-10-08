// xl:title (function () { let s = ""; for (let i = 0; i < 3; i++) { switch (i) { case 0: s += "a"; case 1: s += "b"; break; default: s += "c"; } } return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; for (let i = 0; i < 3; i++) { switch (i) { case 0: s += "a"; case 1: s += "b"; break; default: s += "c"; } } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
