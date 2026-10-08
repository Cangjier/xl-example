// xl:title Promise.prototype.finally 的值传递
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

Promise.resolve(1).finally(() => 2).then((v) => console.log(show(v)));
Promise.reject("e").finally(() => 2).catch((v) => console.log(show(v)));
