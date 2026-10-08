// xl:title 布尔接收者装箱后 String(this)
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return String(this); }).call(true))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
