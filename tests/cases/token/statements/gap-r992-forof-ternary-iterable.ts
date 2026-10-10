// xl:known-gap 第 992 轮量出（**不是本轮引入的**）：`for…of` 的枚举对象是**条件表达式**时，整条语句退化成一个 `ExpressionStatement`——TS 那边这一条是 `ForOfStatement` + `VariableDeclarationList` + `VariableDeclaration` + `ConditionalExpression` + `ArrayLiteralExpression`… 全在（实测 缺 51 个 / 多 2 个：多出来的是 `ExpressionStatement[0,227)` 与 `Identifier "for"`）。入手处：`foreach.xl.md` 的 `ForeachCloseRule`（`Previous` 认下了 `for (… of …)`，收尾那一趟却没把它收成 `Foreach`；真正断在哪一步**还没量**，别按读代码猜）。**「本轮之前就在」是量出来的**：本轮那份改动的产物在 `dist/ts/.xl/cache/typescript/print-ast-common.ts.171`（本轮之前的版本）上量出**同样的** 缺 51 / 多 2——`cases:tsast` 全语料那一片红就是它（`segmentNameOf` 里正是这个形状）。
// xl:note `for…of` 的枚举对象是条件表达式：`for (const x of a ? [b] : [c]) { … }` 该整条收成 `ForOfStatement`
export function f(kind: any, tag: any, key: any): any {
  const table: any = new Map();
  for (const name of kind === undefined ? [tag] : [kind, tag]) {
    const inner = table.get(name);
    if (!(inner instanceof Map)) continue;
    const field = inner.get(key);
    if (typeof field === "string") return field;
  }
  return undefined;
}
