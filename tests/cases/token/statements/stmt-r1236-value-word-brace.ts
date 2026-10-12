// xl:note 第 1236 轮新立：**「引出一个值的词」后面那个花括号**（口径 1.1，第 233 轮
// `typeof` 那一格的同族第三条）。
//
// `IsStatementStart` 里那条「前一个是 `Keyword` 且那个词后面跟的是**值** ⇒ 这一格不是
// 语句开头（`{` 是对象字面量）」原来**只认 `typeof` 一个词**（第 233 轮），
// 理由写在那一格上：「有些关键词后面真的跟一个块（`else` / `try` / `finally` / `do`）」。
// 第 1236 轮把「引出一个值的词」摊成 18 条语句位排版量了一遍：`void` / `delete` /
// `await` / `yield` 那几档**本来就是好的**（它们在树上还是 `Identifier`，走的是
// `previous instanceof Identifier` 那一支），而**量出另外四个词**：
//
//     `const v = a in { b: 1 };`            缺 2 多 3
//     `const v = a instanceof { b: 1 };`    缺 2 多 3
//     `switch (x) { case { a: 1 }: … }`     缺 2 多 3（`case {}:` 那一档缺 1 多 1）
//
// ⇒ 判据从「只认 `typeof`」扩成这五个词（`in` / `instanceof` / `case` 加进来），
// **`else` / `do` / `try` / `finally` 一个都不加**——名单与 `IsStatementStart` 里
// `GenericType` 那一支的那张表同源。
//
// **同族还没收的那一格**（`new` 后面那个花括号）在
// `gap-r1236-new-object-literal.ts` 那条账上：它不是这一句判据的事，是
// `TypeLiteralCloseRule` 先把那个 `{` 认成了类型字面量。
//
// 对照档（**必须不变**）：值位括号里的 `typeof` / `void` / `delete`、
// `else { … }` / `do { … } while` / `try { … } catch` 那几个**真的是块**的花括号。
// xl:round 1236
// xl:end
declare const a: any, b: any, x: any;

const vIn = a in { b: 1 };
const vInstanceof = a instanceof { b: 1 };
const vTypeof = typeof { a: 1 };

switch (x) {
  case { a: 1 }:
    break;
  case {}:
    break;
  default:
    break;
}

// —— 对照：真的是块的那几个花括号
if (a) {
} else {
  b;
}

do {
  a;
} while (b);

try {
  a;
} catch (e) {
  b;
}
