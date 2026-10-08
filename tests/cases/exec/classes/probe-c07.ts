// xl:title (class A {} , (new (class B extends (class {}) {})()) instanceof Object)
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class A {} , (new (class B extends (class {}) {})()) instanceof Object)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
