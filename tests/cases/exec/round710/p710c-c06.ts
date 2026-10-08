// xl:title 生成器对象自己的 toString 标签
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { function* g() {} return Object.prototype.toString.call(g()); })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
