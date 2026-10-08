// xl:title (async function () { return 1; })() instanceof Promise
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why 同上：`(async function () { return 1; })() instanceof Promise` 在 Node 里是真，本仓是假——`async` 函数的返回值没包成承诺。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((async function () { return 1; })() instanceof Promise));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
