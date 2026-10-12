// 第 178 轮：**箭头函数体里的嵌套三元**（`<` 是运算符，不是泛型实参）。
//
// 症状是**静默错值**：`(x, y) => (x < y ? -1 : x > y ? 1 : 0)`——**比较器的标准写法**——
// 本仓给 `1`（Node 给 `-1`）。`cjcli` 的 XML 量到那个 `<` 被判成 `GenericType`，
// 配对到的是 `x > y` 里那个 `>`，于是 `y ? -1 : x` 成了「类型实参」。
//
// 根因在 `IsTypeBracketPosition` 的 `=>` 那一格（`text-common-util.xl.md`）：
// 它原来一刀切「前面是 `=>` ⇒ 类型位」——那一格是为**函数类型的返回类型**
// `(a: A) => (B | C)` 写的，可它同时管住了**箭头函数的体**。
// 修法：递归问一次**箭头自己的形参表**在不在类型位——
// 函数类型的形参表前面是 `:` / `=`→`type` / `<`，箭头函数的形参表前面是 `=`→`let` / `const`
// 或实参表的 `(`；没有括号的形参（`x => …`）直接判值位（函数类型必须带括号）。
//
// 这一份语料同时钉住**两个方向**：①下面这些嵌套三元必须是二元运算 + 三元，
// ②`type F = (a, b) => (number | string)` 这类**函数类型的返回类型**照旧是类型。

type Cmp<T> = (a: T, b: T) => number;
type Val = (x: number) => (number | string);

const cmp = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);

// ① 三种写法都要对：带括号的体 / 不带括号的体 / 用了类型别名的回调
console.log(cmp(1, 2), cmp(2, 1), cmp(1, 1));
console.log([3, 1, 2].slice().sort(cmp).join(","));

const cmpBare = (x: number, y: number) => x < y ? -1 : x > y ? 1 : 0;
console.log(cmpBare(2, 1), cmpBare(1, 2));

const byLen: Cmp<string> = (a, b) => (a.length < b.length ? -1 : a.length > b.length ? 1 : 0);
console.log(["bbb", "a", "cc"].slice().sort(byLen).join(","));

// ② 实参表里的箭头（括号前面是 `(`，最容易被判成类型位的那一格）
console.log([4, 2, 7].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)).join(","));
console.log([4, 2, 7].map((v) => (v < 3 ? "s" : "b")).join(""));

// ③ 不带括号的形参 + 嵌套三元
const pick = (a: number, b: number) => (a < b ? a : b);
console.log(pick(3, 1), pick(1, 3));

// ④ 函数类型的返回类型照旧是**类型**（联合不会被读成值）
const toVal: Val = (x) => (x > 0 ? "pos" : 0);
console.log(toVal(1), toVal(-1));

// ⑤ 类型实参里放函数类型（形参表在 `GenericType` 里，那一格一律是类型位）
const cbs: Array<(a: number) => number> = [(n) => n * 2, (n) => n + 1];
console.log(cbs[0](3), cbs[1](3));

// ⑥ 箭头体里带比较的其它形状（回归：这一族本来就对，不能被改坏）
console.log([1, 5, 3].filter((v) => v < 4).join(","), [1, 5, 3].filter((v) => 4 < v).join(","));
