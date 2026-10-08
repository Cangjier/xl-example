// xl:title class A { x = 1 } Object.getOwnPropertyNames(new A()).join()
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { x = 1 } return (Object.getOwnPropertyNames(new A()).join()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
