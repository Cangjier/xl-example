// xl:expect LogicalOperator,IndexSignature,TernaryOperator,TernaryOperatorCondition
// xl:note 值位数组里的 `in` 是二元运算符，不是映射键；类型位那一半（映射 / 键重映射）同时钉住
// 第 165 轮：值位数组里的 `in` 是**二元运算符**，不是映射键。
//
// `[x in y, 2]` 里的 `in` 是 JS 的关系运算符（结果是布尔），而映射类型的键写成
// `{ [K in T]: X }`。token 层原来只看「括号里有没有 `in`」，于是把值位数组也认成映射键，
// 整个数组被投成 `TypeParameter`。
//
// 补的判据是「容器」：映射键的 `[` 一定长在类型字面量里 —— 要么还是那个 `{` 括号，
// 要么 `{` 已被重组成 `TypeLiteral` 单元（两种都要认；第 163 轮只认前者，尺子当场否掉了）。
// 值位那些容器（`Root` / `Statement` / `(` `[` 括号 / `Method`）一律挡掉。
//
// 这里同时钉住**类型位那一半**：映射类型、键重映射、嵌套映射键都要照旧。

// ① 值位：数组字面量里的 `in`
const obj = { a: 1, b: 2 };
const flags = ["a" in obj, "z" in obj, 2];
const pair = [1 in [1, 2], 5 in [1, 2]];
const single = [("a" in obj)];
const nested = [[("b" in obj)], 3];

// ② 与其它运算符、条件、函数实参混着写
const mixed = ["a" in obj && "b" in obj, ("z" in obj) || false];
function pick(v: boolean): string {
  return v ? "yes" : "no";
}
const called = pick("a" in obj);
const inArg = [pick("z" in obj), pick("b" in obj)];

// ③ 类型位那一半（映射类型 / 键重映射 / 嵌套）
type Keys<T> = { [K in keyof T]: K };
type Remapped<T> = { [K in keyof T as `get${string & K}`]: T[K] };
type Nested<T> = { [K in keyof T]: { [J in keyof T[K]]: 1 } };
interface WithIndex {
  [key: string]: number;
}
type Partial2<T> = { readonly [K in keyof T]?: T[K] };

const keys: Keys<{ a: 1 }> = { a: "a" };
const index: WithIndex = { a: 1 };
const partial: Partial2<{ a: 1 }> = {};
