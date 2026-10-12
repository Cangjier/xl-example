// xl:title `Error.prototype.toString` / `String(err)` 的拼法
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 10 条并成这一条
// （保留 005-error-tostring-root；吸收 013-error-tostring-forms-r291 · 015-error-tostring-forms-r304 · 018-error-stack-absent-forms · 034-error-tostring-r682 · probe-e05 · probe697-e12 · probe697-e19 · probe704-e-a08 · probe704-e-a33）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `Name: message`；name 为空串时只剩 message、message 为空时留一个冒号；改了 name 之后跟着变

// 保留条本身：005-error-tostring-root.ts
(() => {

  console.log(String(new Error("msg")));
  console.log(String(new TypeError("bad")));
  console.log("" + new Error("m"));
})();

// 吸收 013-error-tostring-forms-r291.ts
(() => {

  const e = new Error("boom");
  console.log(e.toString(), String(e), e.message);
  console.log(new TypeError("bad").toString());
})();

// 吸收 015-error-tostring-forms-r304.ts
(() => {

  console.log(String(new Error("boom")));
  console.log(String(new TypeError("bad")));
  const e = new Error("m");
  e.name = "";
  console.log(String(e));
  const e2 = new Error("");
  e2.name = "Custom";
  console.log(String(e2));
})();

// 吸收 018-error-stack-absent-forms.ts
(() => {

  console.log(String(new Error("m")), String(new TypeError("t")), String(new Error()));
})();

// 吸收 034-error-tostring-r682.ts
(() => {
  const named: any = new Error('boom'); named.name = 'Custom';
  try { console.log("plain", String(String(new Error('boom')))); } catch (e) { console.log("plain", "ERR", String(e && e.name)); }
  try { console.log("type", String(String(new TypeError('bad')))); } catch (e) { console.log("type", "ERR", String(e && e.name)); }
  try { console.log("custom", String(String(named))); } catch (e) { console.log("custom", "ERR", String(e && e.name)); }
  try { console.log("empty-message", String(String(new Error()))); } catch (e) { console.log("empty-message", "ERR", String(e && e.name)); }
  try { console.log("instanceof", String([new TypeError('x') instanceof TypeError, new TypeError('x') instanceof Error].join(','))); } catch (e) { console.log("instanceof", "ERR", String(e && e.name)); }
})();

// 吸收 probe-e05.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new RangeError("r").toString()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe697-e12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(String(new Error("m"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe697-e19.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const e = new Error("m"); e.name = "X"; return String(e); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a08.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error("m").toString()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a33.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const e = new Error("m"); e.name = "N"; return e.toString(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
