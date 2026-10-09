// xl:title `call` / `apply` / `bind` 的接收者与解构出来的方法
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe694-m04 · m06 · m17 · m18
// 判据只有一条：这一族三个方法怎么定 `this`——`bind` 给回来的还是函数（`typeof` 是
// `"function"`）、`call` 把接收者交回去、**解构出来的方法不再带原来的接收者**
// （所以 `f.call(o)` 才对）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => { const f = function () { return 1; }; return typeof f.bind(null); });
probe(() => { const o = { f: function () { return this.v; }, v: 4 }; return o.f.call(o); });
probe(() => { const o = { f() { return 1; } }; const g = o.f.bind(o); return g(); });
probe(() => { const o = { f() { return this === o; } }; const { f } = o; return f.call(o); });
