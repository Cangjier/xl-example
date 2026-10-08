// xl:title class A { static x = 1; static { this.y = this.x + 1; } } A.y
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { static x = 1; static { this.y = this.x + 1; } } return (A.y); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
