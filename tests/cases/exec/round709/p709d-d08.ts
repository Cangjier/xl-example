// xl:title 箭头没有 prototype
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((() => {}).hasOwnProperty("prototype"))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
