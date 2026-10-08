// xl:title 数组迭代器的第一次 next
// xl:round 711
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(([1, 2] as any)[Symbol.iterator]().next()))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
