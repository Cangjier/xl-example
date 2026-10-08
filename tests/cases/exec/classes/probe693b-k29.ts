// xl:title (function () { class A { constructor() { return { x: 1 }; } } return new A().x; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor() { return { x: 1 }; } } return new A().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
