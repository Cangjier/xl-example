// xl:title Map 的 Symbol.iterator 在不在
// xl:round 711
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof (new Map() as any)[Symbol.iterator])); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
