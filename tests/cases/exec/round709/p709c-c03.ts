// xl:title [...null] 抛什么
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show([...(null as any)].length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
