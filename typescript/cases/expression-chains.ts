// expression-chains 用例集：成员链 / 索引链 / 可选链 / 非空断言 / 链+运算。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 快照：node typescript/cases/ast-json.mjs expression-chains && node typescript/cases/ast-json-diff.mjs expression-chains
//
// 口径（TS 实测）：可选链的 `?.` 是 TS 的 QuestionDotToken，作为该节点的 child 出现在
// 被访问节点（PropertyAccessExpression / ElementAccessExpression / CallExpression）的 children 里；
// `a?.()` 的 CallExpression children 只有 callee + QuestionDotToken（无实参节点）。
// 非空断言是 NonNullExpression（`!` 不是节点）。

// ===== 1. 成员 / 索引链 =====
a.b.c;
a["b"]["c"];
a[b][c];
a.b[c].d;
(a).b;
f().b;
a.b().c;
// + trivia：点的两侧 / 换行 / 索引内空白
a /* c */ . b;
a\n.b;
a[\nb];
a[ b ];
a.b /* c */ . c;
a.b.c /* c */;

// ===== 2. 可选链 =====
a?.b;
a?.[b];
a?.();
a?.b?.c;
a?.b[c]?.d;
a?.().b;
// + trivia：`?.` 两侧 / 索引内 / 多行
a /* c */ ?. b;
a?. /* c */ b;
a?.[ /* c */ b ];
a?.b?.\nc;
a?.\nb;

// ===== 3. 非空断言 =====
a!;
a!.b;
a!();
a!.b!.c;
// + trivia：`!` 两侧 / 换行
a /* c */ !;
a! /* c */ . b;
a!\n.b;

// ===== 6. 链 + 运算 =====
a.b + c.d;
a?.b ?? c;
-a.b;
typeof a.b;
a.b /* c */ + c.d;

// ===== 7. optional chain 组合（measurement sweep）=====
a?.[b]?.(c);
a?.b?.[c].d;
a?.(b)?.[c];
a?.[b]?.(c)?.[d];
// + trivia
a?.[ /* c */ b]?.(c);
a?.b?.[c] /* c */ .d;
