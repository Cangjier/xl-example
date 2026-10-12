// xl:title (function () { let out = ""; outer: for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j++) { if (j === 1) break outer; out += i + "" + j; } } return out; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; outer: for (let i = 0; i < 2; i++) { for (let j = 0; j < 2; j++) { if (j === 1) break outer; out += i + "" + j; } } return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
