// xl:title class A { #x = 1; static has(o) { return #x in o; } } A.has({})
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { #x = 1; static has(o) { return #x in o; } } return (A.has({})); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
