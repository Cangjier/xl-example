// xl:title Math 常量在描述符里仍然给出数值
// xl:round 709
// xl:judge stdout
// xl:end
const d: any = Object.getOwnPropertyDescriptor(Math, "PI");
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(d.value > 3.14 && d.value < 3.15)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
