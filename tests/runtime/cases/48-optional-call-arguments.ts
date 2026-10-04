// 第 157 轮：可选调用的**实参逗号**（`o.m?.(1, 2)`）——原来让整份文件进不来。
//
// **症状**：`unimplemented: binary operator ,`。
// **根因**：可选调用的实参表被 `NullConditionalOperator` 吞了，于是逗号规则跑的时候
// **还没有 `Method`、也还没有 NCO** —— 它看到的只是一个光秃秃的 `(`，
// 就把 `1, 2` 折成了 `BinaryOperator op=","`。
//
// **判据只能靠「紧挨着的前一格」**：`DecideBracketContext` 不管 `(`（第 57 轮试过、退回来了），
// 而插桩确认那一刻的父子都是 `Bracket`（NCO 还没成形）。但 `?.` 这个记号**已经在列表里**
// （它是一个 `SymbolToken`），所以问「括号前面那一个单元是不是 `?.`」在任何时刻都问得准。
//
// **为什么准**：`?.(` 后面只可能是实参表 —— 想在实参位写逗号运算符得多加一层括号
// `o.m?.((1, 2))`，那一层会让「紧挨着的前一格」变成内层 `(`，判据自然不成立。

const api: any = {
  add: (a: number, b: number) => a + b,
  three: (a: number, b: number, c: number) => a * 100 + b * 10 + c,
  none: () => 7,
  join: (...xs: string[]) => xs.join("-"),
};

// ① 多个实参（这一轮修好的形状）
console.log(api.add?.(1, 2), api.three?.(1, 2, 3), api.join?.("a", "b", "c"));

// ② 与方法为空 / 零实参 / 单个实参混在一起
console.log(api.none?.(), api.missing?.(1, 2), api.add?.(1, 2) + 100);

// ③ 普通调用与内建调用照旧（回归）
console.log(Math.max(1, 2, 3), [1, 2, 3].join("-"), api.join("x", "y"));

// ④ 可选调用的结果再参与运算
console.log(api.add?.(3, 4) * 2, api.three?.(9, 9, 9) === 999);
