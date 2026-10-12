// xl:note 第 960 轮的另一条反向守卫：**模块顶层的 `await`**。
//
// 顶层不在任何一个函数体里，所以「最近那一层函数体是不是 `async`」这条判据在这里
// 答「没有函数体」——只看这一句会把 `await 0;` 一起收成普通标识符；而 TS 那边
// **模块顶层的 `await` 是 `AwaitExpression`**（这里按 TS 非法性口径量过：
// `createSourceFile` 的 `parseDiagnostics` 是 0 条）。
//
// 与 `expr-yield-await-context.ts` 里那几档合起来，这一格的两边才都钉住：
// **带操作数的一律是表达式，只有裸的那个词才按上下文分**（见
// `gap-r955-yield-await-outside-context.ts` 的文件头那张表）。
// xl:end
await 0;
