// xl:title 生成器 return(7) 的值
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { function* g() { yield 1; yield 2; } const it: any = g(); it.next(); return it.return(7).value; })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
