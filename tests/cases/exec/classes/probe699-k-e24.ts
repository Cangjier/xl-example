// xl:title class A { m() {} } Object.getOwnPropertyDescriptor(A.prototype, 'm').enumerable
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { m() {} } return (Object.getOwnPropertyDescriptor(A.prototype, 'm').enumerable); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
