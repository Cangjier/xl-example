// xl:title 装箱后的 constructor 名字
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this.constructor.name; }).call(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
