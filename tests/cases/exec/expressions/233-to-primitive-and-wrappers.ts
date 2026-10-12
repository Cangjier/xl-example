// xl:title ToPrimitive 的次序与提示、包装对象的取值
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**：原先逐批重抄的原子探针与「一个字面量一条」的用例并成这一条，
// 吸收的条（每一条的正文都逐句搬进来，语义一字未改）：
//   · exec/expressions/probe699-c-t01 · t02 · t03 · t04 · t05 · t06 · t07
//     （`t08` 的三格是 `==` 的比较，并进了 `237-abstract-equality`）
//   · exec/expressions/probe2-b07 · b08 · b09 · b10 · b14 · b15
//   · exec/expressions/probe704-x-b46 · b47 · b48 · b49 · b50
//   · exec/expressions/probe699-c-e36 · e37 · e38 · e39 · e40 · e41 · e42 · e43
// 判据只有一条：ToPrimitive 的次序（先 `valueOf` 后 `toString`、`Symbol.toPrimitive` 优先且带提示）
// 与包装对象（`new Boolean` / `new String` / `new Number`）在运算里的落点。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 提示（hint）真的传下去了吗：`+` 给 default、`==` 给 default、`String(o)` 给 string
(function () {
  const order = [];
  const o = { [Symbol.toPrimitive]: (hint) => { order.push(hint); return 1; } };
  const a = o + 1;
  const b = o == 1;
  const c = String(o);
  console.log(order.join(",") + "|" + show(a) + "|" + show(b) + "|" + show(c));
})();
probe(() => { const p = { [Symbol.toPrimitive]: (hint) => "P" }; return p + 1; });
probe(() => { const p = { [Symbol.toPrimitive]: (hint) => "P" }; return `${p}`; });
probe(() => { const o = { toString: () => "S", valueOf: () => "V" }; return o + ""; });
probe(() => { const o = { toString: () => "S", valueOf: () => "V" }; return String(o); });
probe(() => { const o = { toString: () => "S", valueOf: () => "V" }; return `${o}`; });
probe(() => { const o = { [Symbol.toPrimitive]: () => { throw new RangeError("no"); } }; return o + 1; });

// `valueOf` / `toString` 谁先，以及两个都返回对象时的兜底
probe(() => { const o = { valueOf() { return 1; } }; return o == 1; });
probe(() => { const o = { toString() { return "1"; } }; return o == 1; });
probe(() => { const o = { valueOf() { return 1; }, toString() { return "2"; } }; return o + 1; });
probe(() => { const o = { toString() { return "a"; }, valueOf() { return 1; } }; return String(o); });
probe(() => (({ valueOf() { return 2; } }) + 1));
probe(() => (({ toString() { return "t"; } }) + 1));
probe(() => (({ valueOf() { return 2; }, toString() { return "t"; } }) + 1));
probe(() => Number({ valueOf() { return 3; } }));
probe(() => String({ toString() { return "t"; } }));
probe(() => (({ valueOf: () => 7 }) + 1));
probe(() => (({ valueOf: () => ({}) }) + 1));
probe(() => (({ valueOf: () => 7 }) == 7));
probe(() => -({ valueOf: () => 7 }));
probe(() => `${{ toString: () => "T" }}`);
probe(() => String({ toString: () => "T", valueOf: () => 7 }));
probe(() => Number({ toString: () => "5" }));
probe(() => (({ valueOf: () => 3 }) < 4));

// 包装对象：`typeof` 是 object，但比较与运算走 ToPrimitive
probe(() => new Boolean(false));
probe(() => !!new Boolean(false));
probe(() => new Boolean(false) == false);
probe(() => { const s = new String("ab"); return s + ""; });
probe(() => { const s = new String("ab"); return s.length; });
probe(() => { const s = new String("ab"); return s == "ab"; });
probe(() => { const s = new String("ab"); return typeof s; });
probe(() => { const n = new Number(3); return n + 1; });
probe(() => { const n = new Number(3); return n === 3; });
probe(() => { const n = new Number(3); return n == 3; });
probe(() => { const n = new Number(3); return typeof n; });
probe(() => new Number(1) == 1);
probe(() => new String("a") == "a");

// 符号不能转成原始值
probe(() => Symbol("a") + "");

// 错误对象的字符串形态
probe(() => String(new Error("x")));
probe(() => new Error("x").toString());
