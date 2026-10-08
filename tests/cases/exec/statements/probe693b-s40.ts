// xl:title (function () { let s = ""; for (let i = 0; i < 2; i++) { lbl: for (let j = 0; j < 2; j++) { if (j) continue lbl; s += i + "" + j; } } return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; for (let i = 0; i < 2; i++) { lbl: for (let j = 0; j < 2; j++) { if (j) continue lbl; s += i + "" + j; } } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
