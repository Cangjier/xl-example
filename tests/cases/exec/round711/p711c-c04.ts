// xl:title 展开一个数组迭代器
// xl:round 711
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show([...([1, 2] as any)[Symbol.iterator]()].join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
