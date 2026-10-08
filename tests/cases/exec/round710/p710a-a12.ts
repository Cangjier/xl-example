// xl:title 字符串接收者装箱后的 length
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this.length; }).call("abc"))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
