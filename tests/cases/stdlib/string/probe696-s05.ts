// xl:title "a,b".split(/,/).join("|")
// xl:round 696
// xl:judge stdout
// xl:want blocked
// xl:why 同上：`split(/,/)` 里的正则字面量还没进语法层。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("a,b".split(/,/).join("|")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
