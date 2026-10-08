// xl:title 函数自己的 arguments 取值
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function f() {}).arguments)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
