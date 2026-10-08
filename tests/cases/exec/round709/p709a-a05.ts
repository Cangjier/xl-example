// xl:title 生成器函数的自有名字表
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyNames(function* g(a: any) {}).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
