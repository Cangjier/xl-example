// xl:title Promise.resolve 幂等与 thenable
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const t = { then(res) { res(7); } };
console.log(show(Promise.resolve(t) instanceof Promise));
Promise.resolve(t).then((v) => console.log(show(v)));
