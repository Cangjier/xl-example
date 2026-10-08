// xl:title 箭头函数的 this 不受 call 影响
// xl:round 710
// xl:judge stdout
// xl:end
const outer = { v: "o", f() { const g = () => typeof (this as any); return g.call(1); } };
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(outer.f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
