// xl:title call(null) 在松散函数里给全局对象
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this === 1 ? "one" : typeof this; }).call(null))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
