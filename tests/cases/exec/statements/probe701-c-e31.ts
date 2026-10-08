// xl:title (function () { let s = ''; l1: for (let i = 0; i < 2; i++) { l2: for (let j = 0; j < 2; j++) { if (j === 0) continue l1; s += '' + i + j; } } return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; l1: for (let i = 0; i < 2; i++) { l2: for (let j = 0; j < 2; j++) { if (j === 0) continue l1; s += '' + i + j; } } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
