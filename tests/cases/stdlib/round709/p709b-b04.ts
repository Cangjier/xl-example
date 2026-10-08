// xl:title 给 Math.PI 赋值之后的值
// xl:round 709
// xl:judge stdout
// xl:end
Math.PI = 1;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Math.PI)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
