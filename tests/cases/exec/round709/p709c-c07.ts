// xl:title Array.from 一个空对象
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(Array.from({} as any)))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
