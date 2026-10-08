// xl:title (function () { var a = []; for (var i = 0; i < 2; i++) { (function (j) { a.push(j); })(i); } return a.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { var a = []; for (var i = 0; i < 2; i++) { (function (j) { a.push(j); })(i); } return a.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
