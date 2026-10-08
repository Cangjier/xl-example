// xl:title 对象方法里的 arguments
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { return { m() { return arguments.length; } }.m(1, 2); })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
