// xl:title 松散函数 call(1) 的 this 是不是 Number 实例
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this instanceof Number; }).call(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
