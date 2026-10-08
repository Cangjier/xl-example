// xl:title Object.keys(Object.defineProperty({}, "a", {value:1, enumerable:true})).length
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.keys(Object.defineProperty({}, "a", {value:1, enumerable:true})).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
