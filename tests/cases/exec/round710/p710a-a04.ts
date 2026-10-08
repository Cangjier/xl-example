// xl:title 装箱之后 valueOf 给回原值
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this.valueOf(); }).call(7))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
