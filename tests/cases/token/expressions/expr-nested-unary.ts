// xl:expect TypeQuery,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement
// xl:note 套着写的一元运算符（`typeof typeof x` / `!!x` / `- -x`）与单个的一起钉住
// 第 166 轮：**套着写的一元运算符**（`typeof typeof x` / `!!x` / `- -x`）。
//
// `typeof typeof x` 原来折成**一个** `UnaryOperator(op="typeof")` 里装着两个 `Keyword`，
// 而 `x` 被留在它外面 —— 投影只好把第一个 `Keyword` 当操作数，投出
// `TypeOfExpression > TypeOfKeyword`，降级层报 `unimplemented: expression TypeOfKeyword`
//（整份文件进不来）。
//
// 修法与第 164 轮 `**` 的右结合**同一个手法**：一元运算符后面那一格**自己也是个一元运算符**时
// 先放过，让里面那一处先折，再回来折这一处。一并管住 `!!x` / `- -x` / `delete !!o.x` 这些写法。
//
// 这一份同时钉住普通的一元运算（`!` / `-` / `~` / `typeof` 单个的），免得改过头。

const x: any = 5;

// ① 套着写
const doubleTypeof = typeof typeof x;
const doubleBang = !!x;
const doubleNegate = - -x;
const bangNegate = -!x;

// ② 单个的照旧（回归）
const singleTypeof = typeof x;
const singleBang = !x;
const singleNegate = -x;
const singleInvert = ~x;

// ③ 数组里与条件里（值位，安全）
const inCall = [!!x, - -x, typeof typeof "s"];
const inCondition = !!x ? "yes" : "no";

// ④ 类型位里的一元（`typeof` 在类型位是类型查询，不该折成运算）
type Query = typeof x;
type Keyed = keyof typeof x;

// ⑤ **前缀运算符后面接一元运算**（第 167 轮修好）
// `typeof -x`：原来那个 `-` 被读成**二元减**（判据把 `typeof` 当成了操作数），
// 现在 `typeof` / `void` / `delete` 都不算操作数（与一元那份判据对齐）。
const negatedQuery = typeof -x;
const voided = void -x;
// **`delete !!({ p: 1 } as any).p` 这一条不进语料** ✗：它牵扯 `as` 与 `delete` 两层，
// 在 AST 尺子上还有别的差别 ✓（量到 1433/1434 ✓）——与这一轮那条判据无关 ✗，
// 记在台账里 ✓。

// ⑥ **套着写的前缀与比较**（第 169 轮修好）
// `typeof typeof x === "string"`：原来折成 `typeof (x === "string")`（**静默错值**：
// Node 给 `true`、本仓给 `"boolean"`）。机制是队列**按下标**跑：外层 `typeof` 那一趟
// 被「先放过」，同一趟里 `===` 先把内层折走，下一趟外层只好把整个比较式当操作数。
// 修法：`Process` 里**就地先把里面那一处折完**，并让 `Previous` 接住「前缀后面还是前缀」。
const comparesTypeof = typeof typeof x === "string";
const comparesTwoTypeofs = typeof typeof x === typeof s;
const tripleTypeof = typeof typeof typeof x;
const parenthesized = typeof (typeof x === "string");
const singleCompare = typeof x === "number";

// **一条不在这份语料里**：`-!x` —— 布尔参与算术，落在 `RtNeg` 那条已经记着的口径上
//（与 token 层无关）。
