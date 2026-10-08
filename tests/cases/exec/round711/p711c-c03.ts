// xl:title 数组迭代器走完之后的 next
// xl:round 711
// xl:judge stdout
// xl:end
const it: any = ([1] as any)[Symbol.iterator]();
it.next();
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(it.next()))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
