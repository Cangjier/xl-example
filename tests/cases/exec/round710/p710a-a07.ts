// xl:title bind 的原始值接收者
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return typeof this; }).bind(1)())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
