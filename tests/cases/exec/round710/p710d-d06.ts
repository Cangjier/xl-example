// xl:title 类里嵌套的函数声明没有那两格
// xl:round 710
// xl:judge stdout
// xl:end
class A { m() { function inner() { return 1; } return Object.getOwnPropertyNames(inner).join(","); } }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(new A().m())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
