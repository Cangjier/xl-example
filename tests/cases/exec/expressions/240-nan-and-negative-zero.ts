// xl:title `NaN` 的三问与 `-0` 的区分
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/205-object-is-0-0 · 223-nan-nan · 230-object-is-nan-nan
//   · exec/expressions/p-op-nan · p-op-negzero-compare
//   · exec/expressions/probe-o54 · o55
//   · exec/expressions/probe699-c-e47 · e48
//   · exec/expressions/probe704-x-b23
// 判据只有一条：`NaN` 不自等而 `Object.is` 认它、`-0` 与 `0` 用 `===` 分不开而 `1 / -0` 与
// `Object.is` 分得开；`String(-0)` 印的是 `"0"`（负号不是字符串形态的一部分）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// NaN 的三问
probe(() => NaN === NaN);
probe(() => Object.is(NaN, NaN));
probe(() => Number.isNaN("x"));
probe(() => isNaN("x"));
probe(() => typeof NaN);

// -0 与 0
probe(() => Object.is(0, -0));
probe(() => Object.is(-0, 0));
probe(() => -0 === 0);
probe(() => 1 / -0);
probe(() => Object.is(Math.min(0, -0), -0));
probe(() => String(-0));
