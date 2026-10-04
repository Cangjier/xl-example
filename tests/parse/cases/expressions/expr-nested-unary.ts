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

// **三条不在这份语料里**（第 166 轮量出来的，都记在台账里）：
//   · `typeof typeof x === "string"` —— 比较那一趟把 `typeof` 关键字当成操作数，
//     于是折成 `typeof (x === "string")`（值都变了：Node 给 `true`、本仓给 `"boolean"`）；
//   · `typeof -x` —— 里面那个 `-` 被当成二元减，同一个 `TypeOfKeyword` 又冒出来；
//   · `-!x` —— 布尔参与算术，落在 `RtNeg` 那条已经记着的口径上。
// 三条的根因**是同一个**：一元运算符的判据把「运算符关键字」当成了操作数。
