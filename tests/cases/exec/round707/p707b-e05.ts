// xl:title 抛非 Error 的值
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

try { throw "str"; } catch (e) { console.log(show(e)); }
try { throw { code: 1 }; } catch (e) { console.log(show(e.code)); }
