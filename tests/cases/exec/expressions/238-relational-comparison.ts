// xl:title 关系比较 `<` `>` 的转换：字符串按码元、其余按数字
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/196-null-1 · 198-1-2-3 · 199-3-2-1
//   · exec/expressions/probe-o23 · o25 · o26
//   · exec/expressions/probe699-c-e29 · e30 · e31
//   · exec/expressions/probe704-x-b16 · b17 · b19 · b58
// 判据只有一条：关系比较那一条——两边都是字符串就按码元比，否则 ToPrimitive 之后再 ToNumber；
// `NaN` 参与的比较一律为假，链式比较按左结合分两趟。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 字符串 vs 字符串：码元序（"10" < "9" 为真）
probe(() => "10" < "9");
probe(() => "2" > "10");
probe(() => "abc" > "abd");

// 数字 vs 字符串：先 ToNumber
probe(() => 10 < "9");
probe(() => 2 > "10");
probe(() => 1 < "2");

// 空值与 `NaN`
probe(() => null < 1);
probe(() => undefined < 1);
probe(() => undefined > 0);
probe(() => NaN < 1);
probe(() => [] < 1);

// 链式比较左结合
probe(() => 1 < 2 < 3);
probe(() => 3 > 2 > 1);
