// xl:title 函数对象自己的 prototype 在不在
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function f() {}).hasOwnProperty("prototype"))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
