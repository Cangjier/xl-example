// xl:title JSON.parse 的错误形状
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

run(() => { JSON.parse("{oops}"); });
try { JSON.parse("{oops}"); } catch (e) { console.log(show(e.constructor.name)); }
