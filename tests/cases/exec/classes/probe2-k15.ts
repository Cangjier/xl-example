// xl:title (function () { class A { constructor() { return { z: 1 }; } } return new A().z; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor() { return { z: 1 }; } } return new A().z; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
