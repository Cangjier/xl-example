// xl:title 抽象相等 `==` / 严格相等 `===` 的转换表
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来；重复的那些只留一份）：
//   · exec/expressions/175-equality-table · 191-empty-array-eq-not-empty-array · 192-0-false
//   · exec/expressions/193-zero-eq-empty-string · 194-single-element-array-eq-one · 195-null-0
//   · exec/expressions/212-null-undefined · 213-null-undefined · 214-false · 222-0-false · 229-one-eq-string-one
//   · exec/expressions/probe-o18 · o21 · o22
//   · exec/expressions/probe699-c-e03 · e04 · e09 · e33 · e34 · e62 · e63 · t08
//   · exec/expressions/probe704-x-b54 · b55
//   · exec/expressions/probe693b-e14 · e17（第二批）
// 判据只有一条：`==` 的转换表（`null` / `undefined` 只与彼此相等；数字与字符串比数字；
// 布尔先转数字；对象经 ToPrimitive 之后按原始值比）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 空值那一档
probe(() => null == undefined);
probe(() => null === undefined);
probe(() => undefined == null);
probe(() => null == 0);
probe(() => undefined == 0);
probe(() => null == false);

// 布尔与数字 / 字符串
probe(() => 0 == false);
probe(() => "" == false);
probe(() => "0" == false);
probe(() => false == "0");
probe(() => 0 == "0");
probe(() => 0 == "");
probe(() => "" == 0);
probe(() => " \t\n" == 0);
probe(() => 1 == "1");

// 数组与对象经 ToPrimitive
probe(() => [] == false);
probe(() => [0] == false);
probe(() => [1] == true);
probe(() => [] == 0);
probe(() => [] == ![]);
probe(() => [1] == 1);
probe(() => [1, 2] == "1,2");
probe(() => [null] == "");
probe(() => [undefined] == "");
probe(() => "abc" == ["abc"]);

// `NaN` 谁都不等
probe(() => NaN == NaN);

// 第 787 轮并进来的两条（`probe693b-e14` / `e17`）
probe(() => "1" == 1);
probe(() => (({}) == "[object Object]"));
