// xl:title ToNumber：一元 `+` / `-` / `~`、`Number()`、`parseInt` / `parseFloat` / `isNaN`
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**：把「一个字面量一条用例」的那一族并成这一条。
// 吸收的条（每一条的正文都逐句搬进来，语义一字未改）：
//   · exec/expressions/probe-o01 · o05 · o09 · o33 · o34 · o50 · o51
//   · exec/expressions/probe699-c-e20 · e21 · e27 · e50 · e51 · e52 · e53 · e54 · e55 · e56 · e57 · e58 · e59 · e60
//   · exec/expressions/probe704-x-b10 · b39
//   · exec/expressions/probe2-b12
//   · exec/expressions/177-number-coercion · 183-null · 184-undefined · 185-unary-plus-empty-string
//   · exec/expressions/186-unary-plus-empty-array · 187-unary-plus-single-element-array · 188-unary-plus-object
//   · exec/expressions/171-numeric-separator-and-literals
//   · exec/expressions/probe693b-e05（第二批）
// 判据只有一条：值 → 数字的那一趟转换（`ToNumber` 的各种入口，含 `parseInt` / `parseFloat` 的松紧差别）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 一元 `+` / `-` / `~`
probe(() => +true);
probe(() => +"12abc");
probe(() => +" 12 ");
probe(() => -"1");
probe(() => ~"5");
probe(() => +"0x10");
probe(() => +"1e3");
probe(() => +"abc");
probe(() => +[1, 2]);
probe(() => +null);
probe(() => +undefined);
probe(() => +"");
probe(() => +[]);
probe(() => +[5]);
probe(() => +{});

// `Number()` 的边角
probe(() => Number([]));
probe(() => Number([5]));
probe(() => Number([1, 2]));
probe(() => Number({}));
probe(() => Number("0x10"));
probe(() => Number(""));
probe(() => Number("  "));
probe(() => Number("1e2"));
probe(() => Number(true));
probe(() => Number(null));
probe(() => Number(undefined));
probe(() => Number("  12  "));
probe(() => Number("12abc"));
probe(() => Number("1_0"));

// `parseInt` / `parseFloat` / `isNaN` 的松紧
probe(() => parseInt("0x10"));
probe(() => parseInt("10", 2));
probe(() => parseInt(""));
probe(() => parseInt(1.9));
probe(() => parseFloat("1.5e2x"));
probe(() => isNaN("abc"));
probe(() => Number.isNaN("NaN"));

// 数值字面量与边界
probe(() => 1e400);
probe(() => 0x10 + 0o17 + 0b101 + 1_000);
probe(() => 1_000_000);
probe(() => 0b1010);
probe(() => 0o17);
probe(() => 0xff);
probe(() => .5);
probe(() => 5.);
probe(() => 1e3);
probe(() => 1E-3);
probe(() => Number.MAX_SAFE_INTEGER);
probe(() => Number.EPSILON);

// 数字上下文里的除法与减法（都走 ToNumber）
probe(() => 5 / 2);
probe(() => "5" - 1);
probe(() => "5" - 3);
probe(() => true + true);

// 符号进不了 ToNumber
probe(() => +Symbol("a"));

// 一元前缀叠在同一个算式里（第 787 轮并进来的 `probe693b-e05`）
probe(() => +"1" + -"1");
