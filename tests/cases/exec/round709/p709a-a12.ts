// xl:title hasOwnProperty 问 arguments / caller
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function f() {}).hasOwnProperty("arguments") + "," + (function f() {}).hasOwnProperty("caller"))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
