// xl:title 数组解构一个数字抛什么
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { const [a] = (42 as any); return a; })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
