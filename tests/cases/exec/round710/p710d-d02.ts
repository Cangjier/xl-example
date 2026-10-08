// xl:title 箭头函数没有自己的 arguments
// xl:round 710
// xl:judge stdout
// xl:end
function f() { const g = () => typeof arguments; return g(); }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(f(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
