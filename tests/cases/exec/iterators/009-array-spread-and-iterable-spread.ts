// xl:title 数组展开 / 可迭代物展开 / Array.of
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...new Set([1, 2, 1])].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.from(new Set([1, 1, 2])).join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.from('abc').join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...'ab'].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...new Set('aab')].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2, 3]; return [...a, ...a].length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return Array.of(1, 2, 3).join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return [...Array(3).keys()].join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...(function* () { yield 1; yield 2; })()].join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return [1, 2].flatMap(x => [x, x]).join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();
