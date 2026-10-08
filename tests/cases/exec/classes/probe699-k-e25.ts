// xl:title class A { } Object.getPrototypeOf(A.prototype) === Object.prototype
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { } return (Object.getPrototypeOf(A.prototype) === Object.prototype); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
