// xl:title ToString 与 `+` 拼接：数组 / 对象 / 空值 / 布尔
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe-o10 · o30 · o32 · o52 · o53
//   · exec/expressions/probe699-c-e13 · e18 · e19
//   · exec/expressions/probe704-x-b02 · b03 · b51
//   · exec/expressions/176-tostring-null-undefined · 189-string-1-2-3 · 190-string
//   · exec/expressions/224-plus-empty-array-empty-array · 225-plus-empty-array-object
//   · exec/expressions/226-plus-object-empty-array · 227-plus-one-string-two · p-op-plus-coerce
// 判据只有一条：值 → 字符串的那一趟转换（`String()` / 模板 / `+` 拼接里 ToPrimitive 之后那一半）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => String([]));
probe(() => String([1, [2, [3]]]));
probe(() => String({}));
probe(() => String(null));
probe(() => String(undefined));

// `+` 号那一格：两边只要有一边是字符串就拼接，否则走数字
probe(() => "b" + "a" + +"a" + "a");
probe(() => [1, 2] + [3, 4]);
probe(() => [1, 2] + [3]);
probe(() => [1, 2] + "");
probe(() => [] + []);
probe(() => [] + {});
probe(() => (({}) + []));
probe(() => [1] + 1);
probe(() => "1" + 2);
probe(() => 1 + "2");
probe(() => "5" + 1);
probe(() => true + 1);
probe(() => null + 1);
probe(() => undefined + 1);
probe(() => null + "a");

// 字面量里的转义与模板
probe(() => "\u0041\u{42}");
probe(() => `a${1 + 1}b`);
