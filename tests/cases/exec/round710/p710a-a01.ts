// xl:title 严格函数 call(1) 的 this
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function (this: any) { "use strict"; return typeof this; }).call(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
