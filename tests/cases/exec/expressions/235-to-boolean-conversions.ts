// xl:title ToBoolean：`Boolean()` 与 `!!` 的真假表（含包装对象与符号）
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe-o13 · o14
//   · exec/expressions/probe2-b01 · b02 · b03 · b16 · b17 · b18
// 判据只有一条：`ToBoolean` 不看内容只看那一档——对象（含空数组、空包装对象、符号包装）
// 恒为真，空串 / `0` / `NaN` / `null` / `undefined` 恒为假。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => Boolean([]));
probe(() => !!"");
probe(() => Boolean(new Boolean(false)));
probe(() => Boolean(new Number(0)));
probe(() => Boolean(new String("")));
probe(() => Boolean(Symbol()));
probe(() => !!0);
probe(() => !![]);
