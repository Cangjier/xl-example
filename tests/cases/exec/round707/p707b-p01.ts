// xl:title Promise.allSettled 的两档
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

Promise.allSettled([Promise.resolve(1), Promise.reject("e")]).then((r) => {
  console.log(show(r.map((x) => x.status).join("|")));
});
