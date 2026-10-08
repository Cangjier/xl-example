// xl:title 给 Math.PI 赋值不生效
// xl:round 710
// xl:judge stdout
// xl:end
Math.PI = 1;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Math.PI > 3.14)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
