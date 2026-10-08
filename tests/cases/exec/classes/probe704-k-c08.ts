// xl:title (new (class A { constructor() { this.v = 1; } })()) instanceof Object
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((new (class A { constructor() { this.v = 1; } })()) instanceof Object));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
