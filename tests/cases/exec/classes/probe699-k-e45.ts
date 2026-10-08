// xl:title class A { static get [Symbol.species]() { return Array; } } A[Symbol.species] === Array
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { static get [Symbol.species]() { return Array; } } return (A[Symbol.species] === Array); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
