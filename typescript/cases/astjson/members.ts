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
//   M4 语句可解析的其它出现位置：括号内、逗号表达式、调用实参、后缀链起点、行尾注释；
//   M7 ShorthandPropertyAssignment（`{ a }`）与默认值写法（`{ a = 1 }`）；
//   M8 SpreadAssignment（`{ ...expr }`，`...` 只进区间）；
//   M9 字面量属性名（StringLiteral / NumericLiteral / BigIntLiteral）。
//
// 暂缓（不写进本用例集；原因见 docs/coverage-members.md / docs/coverage-expressions.md）：
//   object method                   ({ m() {} });               <- 要 MethodDeclarationShape（types 家族）+ BlockShape（statements 家族）
//   get / set accessor              ({ get a() {} });           <- 要 Get/SetAccessorDeclarationShape（types 家族）
//   computed property name          ({ [a]: 1 });               <- 要 ComputedPropertyNameShape（types 家族）
//   `$` 开头的名字                  ({ $a: 1 });    ({ a$b: 1 });<- basic token（Common）不收 `$`，属用户决策项
// 已收（base 7~9）：shorthand / shorthand with initializer / spread / 字面量名。

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

// ===== base 7：ShorthandPropertyAssignment（名字无 `:`，子节点只有 name）=====
({ a });
({ a, b });
({ a, b, c });
({ a, b, });
// + 与 PropertyAssignment 混排
({ a: 1, b });
({ a, b: 2 });
({ a: 1, b, c: 2 });
// + 默认值写法：ShorthandPropertyAssignment 的三个子节点（name / EqualsToken / initializer）
({ a = 1 });
({ a = 1, b });
({ a = 1, b = 2 });
({ a: 1, b = 2 });
// + trivia
({ /* c */ a });
({ a /* c */ });
({ a /* c */, b });
({ a /* c */ = 1 });
({ a = /* c */ 1 });
({ a\n});
({\na\n});
({ a, /* c */ b });

// ===== base 8：SpreadAssignment（`...` 不进 children，区间从 `...` 起）=====
({ ...a });
({ ...a, ...b });
({ ...a, b });
({ a, ...b });
({ ...a, b: 2 });
({ ...(a) });
({ ...f() });
({ ...a.b });
({ ...a[0] });
({ ...{ a: 1 } });
// + trivia
({ ... a });
({ ...a /* c */ });
({ /* c */ ...a });
({ ...a, /* c */ ...b });
({\n...a\n});

// ===== base 9：字面量属性名（StringLiteral / NumericLiteral / BigIntLiteral）=====
({ "s": 1 });
({ 's': 1 });
({ "": 1 });
({ 1: 2 });
({ 1n: 2 });
({ 0x1f: 2 });
({ "s": 1, 2: 3 });
({ a: 1, "s": 2 });
({ 1: 2, a: 4 });
// + trivia
({ /* c */ "s": 1 });
({ "s" /* c */ : 1 });
({ 1 /* c */ : 2 });
({\n"s": 1\n});
({ "s": 1, 1n: 2 });

// ===== base 10：method / get / set / computed / generator / async 成员 =====
({ m() {} });
({ m(a: A): B { return a; } });
({ get x() { return 1; } });
({ set x(v) {} });
({ [k]: 1 });
({ [k]() {} });
({ *m() {} });
({ async m() {} });
// + 混合成员列表
({ m() {}, get x() { return 1; }, [k]: 2 });
({ a: 1, m() {}, set x(v) {} });
// + trivia：成员前 / 名字后 / get-set 后 / `*` 后 / 计算名内
({ /* c */ m() {} });
({ m /* c */ () {} });
({ get /* c */ x() { return 1; } });
({ * /* c */ m() {} });
({ [ /* c */ k ]: 1 });
({ async /* c */ m() {} });
({\nm() {}\n});

// ===== base 11：async / generator / async generator 方法 =====
// base 10 已有 `({ async m() {} })` 与 `({ *m() {} })`，这里补组合与带参/返回类型形态。
({ async *m() {} });
({ async *m() { yield 1; } });
({ async m(a: A): B { return a; } });
({ async *m(a: A): B { return a; } });
// + computed 名字与修饰组合
({ *[k]() {} });
({ async [k]() {} });
({ async *[k]() {} });
// + 混合成员列表
({ async m() {}, *n() {}, async *o() {} });
({ get x() { return 1; }, set x(v) {}, async *m() {} });
// + trivia：async / `*` / 名字之间注释
({ async /* c */ *m() {} });
({ async * /* c */ m() {} });
({ async *m /* c */ () {} });

// ===== base 12：对象方法里的 super / class generator+async 方法体内的 yield+await =====
// object method 里的 super（TS 语法合法；home object 语义不在 AST 对拍范围）
({ m() { return super.x; } });
({ m() { super.m(); } });
({ get x() { return super.y; } });
({ m() { return super.m().n; } });
({ m() { return super["x"]; } });
({ m() { return super /* c */ . x; } });
// class generator / async 方法：body 经 StatementBuilder + ExpressionBuilder
class C { *m() { yield 1; } }
class C { async *m() { yield* g(); } }
class C { *m() { const x = yield; } }
class C { async m() { await g(); } }
class C { async *m() { await g(); yield 1; } }
class C { *m() { yield yield 1; } }
class C { *m() { /* c */ yield 1; } }
class C { async m() { await /* c */ g(); } }
// class static block（oracle parse-legal；能否建树由本行实测决定）
class C { static { } }
class C extends B { static { super.x; } }

// ===== base 13：对象字面量方法的返回类型（含 TypePredicate）=====
({ m(x: any): x is A { return true; } });
({ m(x: any): asserts x is A {} });
({ m(): A { return a; } });
({ get x(): A { return a; } });
({ set x(v: A) {} });
// `this` 作为返回类型（TS 是 ThisType 节点）
({ m(): this { return this; } });
({ get x(): this { return this; } });
// `this is A` / `asserts this is A` 谓词（TS 的 TypePredicate.parameterName 是 ThisType）
({ m(x: any): this is A { return true; } });
({ m(): asserts this is A {} });
({ get x(): asserts this is A { return true; } });
// + trivia：`:` 两侧注释
({ m(x: any) /* c */ : /* c */ x is A { return true; } });
({ m /* c */ (): /* c */ A { return a; } });
// 暂缓：对象方法的 type parameters（`({ m<T>(x: T): T { return x; } })`）—— object literal 泛型方法未接

// ===== base 14：对象字面量泛型方法（TS 5.0）：TypeParameter 在名字之后 =====
({ m<T>(x: T): T { return x; } });
({ m<T, U>(x: T, y: U): T { return x; } });
({ m<const T>(x: T) { return x; } });
({ async m<T>(x: T): T { return x; } });
({ *m<T>(x: T) {} });
({ m<T> /* c */ (x: T): T { return x; } });
// ===== base 15：对象字面量方法类型参数约束 / 默认值 =====
({ m<T extends A>(x: T): T { return x; } });
({ m<T = A>(x: T): T { return x; } });
({ m<const T extends A>(x: T) { return x; } });
({ m<T extends A, U = B>(x: T, y: U): T { return x; } });
// ===== base 16：async generator 方法 / 私有成员链（measurement sweep）=====
class C { async *m() {} }
class C { static async *g() {} }
class C { public async *m() {} }
class C { async m(a: A): Promise<B> { return b; } }
class C { #x = 1; m() { this.#x; } }
class C { #m() {} m2() { this.#m(); } }
class C { #p = 1; m() { this.#p.q; } }
class C { #m() {} get #g(): A { return a; } set #s(v: A) {} }
class C { static #s = 1; static #m() {} }
// + trivia
class C { async *m /* c */ () {} }
class C { static /* c */ async *g() {} }
class C { #p = 1; m() { this. /* c */ #p.q; } }
// ===== base 17：对象方法 + 对象返回类型（返回类型以 `{` 开头，Stage 2-C）=====
({ m(): { a: number } { return { a: 1 }; } });
({ m(): { a: number } {} });
({ m(): { a: 1 } | { b: 2 } { return { a: 1 }; } });
const o = { m(): { a: number } { return { a: 1 }; } };