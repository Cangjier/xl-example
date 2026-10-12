// xl:expect ParenthesizedType,TupleType,FunctionType,ArrayType
// xl:note 实参表里的括号是值位（`f("x", (a & b))`）；类型位那一半在同名的 type- 用例里
// 第 162 轮：**实参表里的括号是值位**。
//
// token 层的 `IsTypeBracketPosition` 原来把「前面是 `,` 或 `(`」一律当**类型位**——
// 那两条是给类型的成员表 / 参数表 / 元组写的（`type F = (a: A, b: B) => C`、
// `[A, (B | C)]`），可**实参表里也有逗号**：`f("x", (a & b))` 里 `a & b` 于是被当成
// **交叉类型**，降级层报 `unimplemented: expression IntersectionType`（整份文件进不来）。
//
// 修法：那两个符号出现时先问一句「宿主 `(` 是不是**某次调用的实参表**」
//（只看它前面那一格：名字 / 方法 / 属性访问 / `)` / `]` ⇒ 是调用）。
//
// 这一份是**值位那一半**；类型位那一半在同名的 `type-` 用例里（元组、函数类型、
// 括号类型都要照旧）。

const a = 1;
const b = 2;
const obj = { m: (v: number) => v * 2, n: () => ({ k: 3 }) };

// ① 逗号之后的括号（原来整份文件失败的那一条）
console.log("x", (a & b), "y");
console.log("x", (a | b), "y", (a ^ b));
console.log("x", (a + b) * 2, "y", (a > b));
console.log("x", (a & b) + 1, "y", String(a | b));

// ② 其它实参形状：方法调用、下标调用、调用结果再调用
console.log(obj.m((a | b)), obj.n().k, [1, 2].join(","));
function curry(): (v: number) => number { return (v: number) => v + 1; }
console.log(curry()((a & b) + 3));

// ③ 第一个实参里的括号（这一条本来就对，留着当回归）
console.log((a & b), "first");

// ④ 嵌套与括号套括号
console.log("deep", ((a | b) & 3), "end");

// ⑤ 类型位那一半照旧（元组 / 函数类型 / 括号类型）
type Tup = [number, (string | boolean)];
type Fn = (x: (number | string), y: boolean) => void;
type Paren = (number | string)[];
const tup: Tup = [1, "s"];
const fn: Fn = (x: (number | string), y: boolean) => undefined;
const paren: Paren = [1, "s"];
console.log(tup[0], tup[1], fn(1, true), paren.length);
