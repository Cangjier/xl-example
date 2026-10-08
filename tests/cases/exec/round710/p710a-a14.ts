// xl:title call 一个对象时不动它
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { return this === null ? "no" : (this as any).tag; }).call({ tag: "t" }))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
