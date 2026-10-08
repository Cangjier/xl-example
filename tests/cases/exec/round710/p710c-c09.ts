// xl:title GeneratorFunction 的构造器名
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function* () {}).constructor.name)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
