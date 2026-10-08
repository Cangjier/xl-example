// xl:title defineProperty 改已有元素那一格
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const xs = [1, 2, 3]; Object.defineProperty(xs, "1", { value: 9 }); return [xs[1], xs.length, Object.keys(xs).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
