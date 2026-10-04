// 第 144 轮：真假只有一个定义（**空串是假**）。
//
// `Value.AsBool` 只看标签与载荷 —— 它答对了**除空串以外**的每一档。
// 而 `if` / `while` / `&&` / `||` / `?:` / `!` / `filter` / 谓词族用的都是它，
// 于是 `if ("")` 走了**真**那一支、`!("")` 给**假** —— **静默错值**：
// 不报错、不抛，只有一个看起来像巧合的结果（`if (s)` 与 `[""].filter(x => x)`
// 还会给出**两个**答案）。
//
// 修法只有一条：`rt.xl.md` 的 `TruthyOf(table, value)` 是唯一的答案
// （空串那一档要去堆里看码元长度），五个调用点全部改走它。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

const empty = "";
const blank = " ";
const zero = 0;
const nan = Math.sqrt(0 - 1);

// ① 四条构造（`if` / `?:` / `&&` / `||`）都落在 `jmp_if_false` 上
if (empty) { console.log("if-empty-truthy"); } else { console.log("if-empty-falsy"); }
if (blank) { console.log("if-blank-truthy"); } else { console.log("if-blank-falsy"); }
console.log(empty ? "T" : "F", blank ? "T" : "F", zero ? "T" : "F");
console.log(empty && "and", blank && "and", zero && "and");
console.log(empty || "or", zero || "zero", blank || "blank");

// ② `!` 与 `while`（同一格判据的另外两个落点）
console.log(!empty, !blank, !zero, !"x", !nan);
let guard = 0;
while (empty) { guard = guard + 1; }
console.log("while", guard);

// ③ 建库层的真假：`filter` 与谓词族（第 144 轮之前它们直接写 `AsBool()`）
console.log(["", "a", ""].filter((s) => s).join("|"));
console.log(["", "a"].some((s) => s), [""].some((s) => s));
console.log(["", "a"].every((s) => s), [""].every((s) => s));
console.log([""].find((s) => s) === undefined, [""].findIndex((s) => s));

// ④ 循环体里的真假（`for..of` + `if`）与函数的返回值当真假用
const words = ["", "a", "bb"];
let count = 0;
for (const w of words) { if (w) count = count + 1; }
console.log("count", count);

function pick(s: string): string { return s; }
if (pick("")) { console.log("pick-truthy"); } else { console.log("pick-falsy"); }

// ⑤ 非字符串那几档照旧（`0` / `-0` / `NaN` 假，其余真）——
//    这几条是 `AsBool` 本来就答对的，改口径不能把它们动坏。
console.log(!0, !(0 - 0), !1, !(0 - 1), !!null);
