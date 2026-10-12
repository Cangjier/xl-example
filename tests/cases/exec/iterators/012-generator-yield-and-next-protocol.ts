// xl:title 生成器的 yield / next / done / `yield*` / `return` 清理与 `throw` 注入
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { yield 1; yield 2; })() && [...(function* () { yield 1; yield 2; })()].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...(function* () { yield* [1, 2]; yield 3; })()].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = (function* () { yield 1; yield 2; })(); return it.next().value + it.next().value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = (function* () { yield 1; })(); return it.next().done + ':' + it.next().done; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = (function* () { yield 1; })(); it.next(); return it.next().value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { yield 1; yield 2; })().next().value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { return 5; })().next().value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { const x = yield 1; return x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { const r = yield* [1, 2]; return r; })().next().value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function* g() { try { yield 1; yield 2; } finally { log.push("cleanup"); } }
const log = [];
const it = g();
it.next();
it.return(7);
console.log(log.join(",") + "|" + show(it.next().done));
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const log = [];
function* g() { log.push("start"); try { yield 1; } finally { log.push("fin"); } }
const it = g();
log.push(it.next().value);
try { it.throw(new Error("boom")); } catch (e) { log.push("caught"); }
console.log(log.join(","));
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const it = (function* () { yield 1; yield 2; return 3; })();
console.log(show(it.next().value) + "|" + show(it.next().value) + "|" + show(it.next().value) + "|" + show(it.next().done));
})();
