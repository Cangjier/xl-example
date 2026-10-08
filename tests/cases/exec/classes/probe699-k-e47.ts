// xl:title class A { #x; static peek(o) { return #x in o; } } A.peek(Object.create(A.prototype))
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { #x; static peek(o) { return #x in o; } } return (A.peek(Object.create(A.prototype))); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
