// xl:title Array.prototype.forEach.call({ length: 2 }, () => { throw new Error("x"); }), "not-called"
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.forEach.call({ length: 2 }, () => { throw new Error("x"); }), "not-called"));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
