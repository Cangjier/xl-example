// members 用例集：对象字面量成员，借表达式语句测量（`({ ... });` 这类行，避开语句首 `{` 的块歧义）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行（多行语句因此也能逐行对齐）。
// 生成器会 trim 每行、丢弃以 // 开头的行，所以注释必须独立成行。
// 对拍口径：TS 侧 ts.createSourceFile 的 AST；本仓侧 SourceFileRunner.Parse 的形状树。
// 快照：node typescript/cases/ast-json.mjs members && node typescript/cases/ast-json-diff.mjs members
//
// 覆盖范围：
//   M1 PropertyAssignment：名字覆盖标识符名与关键字名（TS 的 IdentifierName 允许关键字），
//      值覆盖字面量 / 前缀一元 / 属性访问 / 元素访问 / 调用 / 括号 / 二元 / 三元 / 赋值 / 数组 / 对象嵌套；
//   M2 空对象字面量、嵌套、重复形（2~4 条）、行尾逗号；
//   M3 trivia：前导注释、名后 / 冒号后 / 值后注释、行内换行、多行、逗号前后注释；
//   M4 语句可解析的其它出现位置：括号内、逗号表达式、调用实参、后缀链起点、行尾注释。
//
// 暂缓（不写进本用例集；原因见 docs/coverage-members.md）：
//   shorthand-property-assignment   ({ a });    ({ a, b });      <- ParseObjectLiteral 只认 `名字 : 值`
//   spread-assignment               ({ ...a });                 <- ParseObjectLiteral 不认 `...`
//   object method                   ({ m() {} });               <- 同上，且要 MethodDeclarationShape（types 家族）
//   get / set accessor              ({ get a() {} });           <- 同上，且要 Get/SetAccessorDeclarationShape
//   computed property name          ({ [a]: 1 });               <- 同上，且要 ComputedPropertyNameShape
//   shorthand with initializer      ({ a = 1 });                <- 同上
//   字面量名                        ({ "s": 1 });   ({ 1: 2 }); <- ParseName 不认字面量名（后者还被当成 Identifier）
//   `$` 开头的名字                  ({ $a: 1 });    ({ a$b: 1 });<- basic token（Common）不收 `$`，属用户决策项

// ===== base 1：PropertyAssignment 的 base（标识符名 + 字面量值）=====
({ a: 1 });
({ a: 1.5 });
({ a: 0x1f });
({ a: 1n });
({ a: "s" });
({ a: /r/ });
({ a: `t` });
({ a: true });
({ a: false });
({ a: null });
({ a: this });
// + 名字是关键字（IdentifierName）
({ if: 1 });
({ true: 1 });
({ let: 1 });
({ of: 1 });
({ this: 1 });
({ async: 1 });
({ yield: 1 });
({ await: 1 });
({ get: 1 });
({ set: 1 });
({ new: 1 });
({ class: 1 });
({ typeof: 1 });
({ in: 1 });
({ if: 1, a: 2 });
({ a: 1, if: 2 });

// ===== base 2：值是表达式 =====
({ a: b });
({ a: b.c });
({ a: b[0] });
({ a: f(b) });
({ a: (b) });
({ a: -1 });
({ a: !b });
({ a: b + c });
({ a: b * c + d });
({ a: b ? c : d });
({ a: b = c });
({ a: [1, 2] });
({ a: [] });
({ a: b, c: d });

// ===== base 3：空对象字面量与嵌套 =====
({});
({ });
({ a: { b: c } });
({ a: { b: { c: 1 } } });
({ a: 1, b: { c: 2 } });
({ a: { b: 1 }, c: { d: 2 } });
({ a: [1, { b: 2 }] });

// ===== base 4：重复形与行尾逗号 =====
({ a: 1, b: 2 });
({ a: 1, b: 2, c: 3 });
({ a: 1, b: 2, c: 3, d: 4 });
({ a: 1, b: 2, });
({ a: 1, b: 2, c: 3, });

// ===== base 5：trivia =====
({ /* c */ a: 1 });
({ a /* c */ : 1 });
({ a: /* c */ 1 });
({ a: 1 /* c */ });
({ a: 1, /* c */ b: 2 });
({ /* c */ a: 1, /* d */ b: 2 });
({\na: 1\n});
({ a\n: 1 });
({ a:\n1 });
({ a: 1,\nb: 2 });
({\na: 1,\nb: 2\n});
({\na: 1,\nb: 2,\nc: 3\n});
({ a /* c */ : /* d */ 1 });

// ===== base 6：同一文件的其它出现位置 =====
(/* c */ { a: 1 });
({ a: 1 }).a;
({ a: 1 }) /* c */;
({ a: 1 }); // c
(a, { b: 1 });
({ a: 1 }, { b: 2 });
f({ a: 1 });
f({ a: 1 }, { b: 2 });
f(/* c */ { a: 1 });
f({ a: 1 } /* c */);
