// xl:title call() 不给 this 的松散结果
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this === null ? "null" : typeof this; }).call())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
