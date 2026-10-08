// xl:title class A { static m() { return 1; } } class B extends A { static m() { return super.m() + 1; } } B.m()
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { static m() { return 1; } } class B extends A { static m() { return super.m() + 1; } } return (B.m()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
