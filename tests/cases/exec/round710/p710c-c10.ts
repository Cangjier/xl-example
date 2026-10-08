// xl:title 迭代一个生成器的展开
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { function* g() { yield 1; yield 2; } return [...(g() as any)].join(","); })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
