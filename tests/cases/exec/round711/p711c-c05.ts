// xl:title values 与 Symbol.iterator 是同一个函数吗
// xl:round 711
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(([] as any)[Symbol.iterator] === ([] as any).values)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
