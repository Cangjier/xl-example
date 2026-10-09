// xl:title 集合展开：Set 去重 / Map 的 entries / values / keys
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...new Map([['a', 1]])].map(e => e.join(':')).join(',')));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([[1, 2]]); return [...m.values()][0]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([[1, 2]]); return [...m.keys()][0]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return [...new Set([[1], [1]])].length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();
