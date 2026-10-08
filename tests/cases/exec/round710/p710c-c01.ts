// xl:title Map 迭代器条目按下标读
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { const m = new Map([["a", 1]]); const it: any = (m as any)[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
