// xl:title 可选链与空值合并的组合边界
// xl:round 749
// xl:judge stdout
// xl:want differ
// xl:why **两级可选链 + 二元运算符**那一格把**接收者**当成了结果（**静默错值**）：
// xl:why `o.a?.b?.c + 1` 本仓给 `[object Object]1`（拿到的是 `o.a` 那个对象）、
// xl:why `o.a?.b?.c ?? 9` 给 `{ c: 1 }`（Node 两处都给 `2` / `1`）。
// xl:why **分界量清了**：`o.a?.b`（一级）对、`o.a.b?.c`（点号链后一级）对、
// xl:why `o.a?.b?.c` 单独用（不带运算符）**也对**——只有「**两级 `?.` 再接一个运算符**」错。
// xl:why 根在 **token 层的 `BinaryOperatorCloseRule.Process`**（`binary-operator.xl.md`）：
// xl:why 第 156 轮给「`?.` 链是一条链」加了往前多走一趟，判据是
// xl:why 「前面那一格是 NCO，而 NCO 前面**还是** NCO」——那一趟从 `NCO(c)` 退到 `NCO(b)`
// xl:why 就停了，于是**链的起点**取成了 `a`，而 `o` 与那个 `.` **留在 `BinaryOperator` 外面**。
// xl:why 实测 XML：`[Identifier(o), SymbolToken(.), BinaryOperator(??)( Identifier(a), NCO(b), NCO(c), ??, 9 )]`
// xl:why ——投影照这个形状投，`o.` 于是接到了「整个 `a?.b?.c ?? 9`」这个结果上。
// xl:why **正确的起点**要把「`NCO` 之前那一截 `Identifier` + `.`」一起收进来（`o.a`），
// xl:why 而那一趟现在只跳 `NCO`。这一轮先把它量清楚（最小复核见 `xl:why` 里那三个形状），
// xl:why **没有动那一支**：它上面压着可选链那一整片判据（第 156 轮的第一版
// xl:why 「对所有 NCO 都往前收」当场掉了两条 `cases:tsast`，退回之后才收紧成现在这一条）。
// xl:end
// 本文件是 `p749a-a15` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const o: any = { a: { b: { c: 1 } }, m() { return { n: 2 }; } };
console.log(o.a?.b?.c, o.a?.x?.c, o?.a?.b?.c, o?.x?.y?.z);
console.log(o.m?.().n, o.x?.().y, o.m?.().n ?? "fb");
console.log((null as any)?.a ?? "n1", (undefined as any)?.a ?? "n2", (0 as any)?.a ?? "n3");
console.log(o.a?.b?.c ?? 9, o["a"]?.["b"]?.["c"]);
let calls = 0;
const f = () => { calls++; return null; };
console.log(f()?.x ?? "safe", calls);
