// xl:title 展开一个真数组仍然好
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show([...[1, 2]].join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
