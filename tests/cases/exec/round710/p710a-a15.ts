// xl:title new 一个 bind 出来的函数
// xl:round 710
// xl:judge stdout
// xl:end
function F(this: any, v: any) { this.v = v; }
const B: any = F.bind({ v: "bound" });
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(new B(3).v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
