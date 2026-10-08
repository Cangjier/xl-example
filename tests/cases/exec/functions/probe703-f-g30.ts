// xl:title (async () => {}).constructor.name
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why 同 `p703f-g16`：`(async () => {}).constructor.name` 在 JS 里是 `"AsyncFunction"`（异步函数有**自己的**原型与构造函数），本仓给 `"Function"`。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((async () => {}).constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
