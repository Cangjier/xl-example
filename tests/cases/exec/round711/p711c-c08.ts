// xl:title 取迭代器的 next 存下来再调
// xl:round 711
// xl:judge stdout
// xl:end
const it: any = ([5] as any)[Symbol.iterator]();
const step: any = it.next;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(step.call(it).value)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
