// xl:title 数组迭代器上的 next 类型（typeof 链那一格的第三个出口）
// xl:round 711
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof ([] as any)[Symbol.iterator]().next)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
