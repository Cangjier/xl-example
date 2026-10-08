// xl:title 对象方法没有那两格
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(({ m() {} }).m.hasOwnProperty("arguments"))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
