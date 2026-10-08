// xl:title typeof 数组字面量下标调用链
// xl:round 711
// xl:judge stdout
// xl:end
const arr: any = [() => ({ v: 2 })];
const i = 0;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof arr[i]().v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
