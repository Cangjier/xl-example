# class/interface members 覆盖报告（chunk 1）

分支 `cover-class-members-1`，起点 `origin/integration @ebbbacab`。

## 读数（实测）

| 指标 | 基线 | 本块之后 |
| --- | --- | --- |
| ast-json 全量 | 1734 / 1734 | **1782 / 1782**（16 构造） |
| declarations.ts | 108 | **156 / 156**（+48） |
| diff | 全一致 | 1782 全一致，结构差 / 位置差 / 字段差均 0 |
| tsc | 0 error | 0 error |

## 已测量（绿色，base + trivia）

1. class 字段：`x = 1`、`x: number = 1`、`x`、`x = a`、`readonly x = 1`、`static x = 1`、`private/public/protected x ...`、`x; y;`
2. 方法：`m()`、`m(a)`、`m(a: A)`、`m(a: A, b: B)`、`m(): C`、`m(a: A): B { return a; }`、`static/private/public`，
   以及与属性混排、多方法重复形
3. 构造：`constructor()`、`constructor(a: A)`、`constructor(a, b)`、`private constructor()`
4. 访问器：`get x()`、`set x(v)`、get+set 同体、`static get x()`
5. computed 名：`[k] = 1`、`[k]() {}`
6. interface 成员：`a: number`、`a?: number`、`readonly b: string`、`m(): void`、`m(a: A): B`、`[k: string]: A`、
   多成员混排、多行
7. trivia：前导注释、名字/`=`/`;` 前后注释、修饰符后注释、多行函数体、成员间注释

## 实现

- `ClassDeclarationShape.BuildMembers`：类体 `Bracket.Data` 逐成员——修饰符（keyword leaves，`get`/`set` 只作访问器标志
  不进 Data）→ 名字（Identifier 或 `[expr]` ComputedPropertyName）→ 按下一单元分派：`(` 走方法/构造/访问器
  （参数：无类型建 Identifier 叶子、带 `:`/`?:` 走 `TypeBuilder.ParseParameter`；返回类型 `TypeBuilder.ParseType`；
  函数体 `StatementBuilder.BuildStatement`），`:` / `=` / `;` 走属性（类型 `TypeBuilder.ParseType`、
  初始化器 `ExpressionBuilder.ParseAssign`）。`constructor` 不投影名字（TS Constructor 只有参数与函数体）。
- `InterfaceDeclarationShape.BuildMembers`：接口体与类型字面量同口径，直接循环 `TypeBuilder.ParseTypeMember()`
  （PropertySignature / MethodSignature / IndexSignature / CallSignature 全部复用）。
- class/interface 的 possible-shape 不再对非空体 Reject（成员由 shape 建）。
- 成员 Pos = 前一个成员（或 `{`）`End.Index + 1`；成员 end = 函数体 `}` / 属性末尾 `;`，与 TS 一致。

## 暂缓

- class 表达式带成员 `(class { x = 1; });`：需要改 expressions 家族的 `ParseClassExpression`，本块不碰 expressions。
- 装饰器、static block、class overloads、abstract 方法、泛型声明、体前换行（根 ASI 判据，cover-end-1 范围）。

## 踩坑（重要）

- 当前 integration **不含** cover-declarations-3（heritage）：`members/heritage-clause-shape.xl.md` 仍是空壳、
  没有 `BuildClauses`。因此本块的 class/interface shape 按 integration 现状**不含 heritage 代码**；
  heritage（chunk3）需要单独合并后再在此 shape 上恢复 `HeritageClauseShape.BuildClauses` 调用。
- `*.xl.md` 必须 UTF-8 无 BOM + LF；用 PowerShell 5.1 的 `Set-Content -Encoding utf8` 会写 BOM+CRLF，xl_build 直接报 E0005。
- 不要把相对路径交给 .NET 的 `File.ReadAllText`（它用进程 CWD，不是 PowerShell 的 `cd`）——会误改主仓文件。

## chunk 2（class element extras，branch cover-class-extras-1 @ origin/integration 22e87cfe）

- abstract 方法/属性：`abstract class C { abstract m(): void; }`、`abstract x: number;`、多个 abstract 成员、与普通成员混排 + trivia
- 方法 overload：`m(a: A): B; m(a): any { return a; }`、`m(): void; m() {}`、两条 overload + implementation、overload 后接属性 + trivia
- static block：`static { a(); }`、`static {}`、与字段/方法混排、块内注释 + trivia
- 实现：ClassDeclarationShape.BuildMembers 的方法分支现在允许「无体」形式——参数表/返回类型之后没有 `{` 时吃 `;`，
  MethodDeclaration 不装 Block（TS overload/abstract 签名同形）；`static` 修饰符后面直接跟 `{` 时改走
  ClassStaticBlockDeclarationShape（children 只有 Block，static 关键字不投影），区间到 `}`；属性分支原本已支持 `abstract x: A;`。
- 读数：declarations 229/229（原 210 + 19 条 extras）；全量见下；tsc 0 error。

### 暂缓
- 装饰器 `@dec class C {}` / `class C { @dec m() {} }` / `@dec x = 1`：需要 class candidate Stage 0 放行 `@`+装饰器表达式，
  并在成员前缀分派 Decorator（types/decorator-shape 仍是空壳）；本块预算内未做，已写成 declarations.ts 的 // 目标。
- private fields (#x)、parameter properties、accessor keyword、abstract accessors：各自形状未就绪。

## chunk 3 (class element wave 2, branch cover-class-extras-2 @ origin/integration 895a4ba5)

- private identifiers: `class C { #x = 1; }`, `#x;`, `#x: A;`, `#m() {}`, `#m(a: A): B {...}`, `get #x()`, `set #x(v)`,
  multiple private members, mixed with public members + trivia.
  Implementation: BuildMembers name dispatch: `#` (Symbol) + Common name -> PrivateIdentifierShape (pos from `#`, end at name).
- parameter properties: `constructor(private x: A)`, `public` / `readonly` / `protected`, `private readonly x: A`,
  `private x` (no type), mixed with normal params on both sides + trivia.
  Implementation: BuildParameters detects leading modifier group, builds keyword leaves + Identifier + optional type
  (TypeBuilder.ParseType) and closes with TypeBuilder.SpanNode.
- accessor keyword: `class C { accessor x = 1; }`, `accessor x: A;`, `accessor x;`, `static accessor x = 1;`,
  multiple accessors, mixed with methods + trivia. Implementation: `accessor` added to modifier whitelist and mapped to
  AccessorKeywordShape (keyword leaf; TS kind AccessorKeyword).
- readings: declarations 276/276; full suite 2688/2688 (baseline 2653 + 35); tsc 0 error.

### deferred
- private-in expression `#x in obj`: needs expressions/expression-builder ParsePrimary dispatch for Symbol "#" (out of write scope).
- decorators: `@dec class C {}` / `class C { @dec m() {} }` / `@dec x = 1`: needs class candidate accepting "@"+decorator expression
  (and Decorator shape; types/decorator-shape is still a shell) -- not done in this chunk.
- abstract accessors, parameter decorators, decorator metadata.

## chunk 4 (decorators, branch cover-decorators-1 @ origin/integration d3c27487)

- class decorators: `@dec class C {}`, `@a @b class C {}`, `@a @b @c`, `@dec()`, `@dec(a)`, `@a.b`,
  `@dec abstract class C {}`, `@dec declare class C {}`, two decorated classes, + trivia.
- member decorators: `@dec m() {}`, `@dec x = 1;`, `@a @b m() {}`, `@dec get x()`, `@dec set x(v)`,
  `@dec m(a: A): B {...}`, `@dec() m()`, `@dec() x = 1`, `@a.b m()`, one decorator per member, `@dec x;`, + trivia.
- implementation: types/decorator-shape.xl.md gets DecoratorShape.FromParts(atToken, expression, pos)
  (children = expression only; pos starts at `@`, end = expression end).
  class candidate: new Stage 6 accepts `@` + decorator expression tokens then `class`/`declare`/`abstract`
  (no regression: non-decorated declarations keep the old Stage 0 strictness),
  class FromUnits + BuildMembers parse the decorator prefix with a minimal inline ExpressionBuilder entry
  (Load(code.slice(...), afterAt) + ParseExpression; no expression-builder source change was needed),
  decorators are added before modifiers (TS child order) and member pos starts at the first `@`.
- readings: declarations 305/305 (baseline 276 + 29); full suite 2820/2820 (baseline 2791); tsc 0 error.

### deferred
- newline between decorator and declaration (`@dec\\nclass C {}`): root end candidate treats `dec` as an
  expression-complete item at the newline (IsAsiBoundary) and conflicts with the class candidate;
  same family as newline-before-body, fix belongs to files/source-file-end-possible-shape scope.
- parameter decorators, decorator metadata, decorators on interfaces/enums.

## chunk 5 (method modifiers, branch cover-method-mods-1 @ origin/integration 890e3b0a)

- async methods: `async m() {}`, `async m(a: A): B { return a; }`, `static async`, `private async`, two async methods.
- generator methods: `*m() {}`, `*m() { yield 1; }`, `*m(a: A): B { yield a; }`, `static *m()`, `private *m()`, two generators.
- async generator: `async *m() {}`, `async *m() { yield 1; }`, `static async *m()`, `async *m(a: A): B { yield a; }`.
- accessor modifiers: `public get x()`, `public set x(v)`, `private get x()`, `async get x()`, `async set x(v)`, `static get x()`.
- decorator combinations: `@dec async m()`, `@dec *m()`, `@dec async *m()`, `@a @b *m()`, + trivia.
- implementation: BuildMembers now consumes a `*` (Symbol) after modifiers and before the name,
  builds AsteriskTokenShape (punctuation/asterisk-token-shape, pos = previous token end+1, sign in/out on the `*`),
  and adds it between modifiers and name (TS order: decorators, modifiers, AsteriskToken, name, params, return type, body).
  Fix needed for decorated generators: the member decorator expression parser is truncated at a `*` symbol,
  otherwise `@dec *m()` parses `dec * m` as a BinaryExpression.
- readings: declarations 338/338 (baseline 305 + 33); full suite 3029/3029 (baseline 2996); tsc 0 error.

### deferred
- abstract accessors, overload + async / generator combos, object-literal async/generator methods (expressions family).

## chunk 6 (heritage expressions, branch cover-heritage-2 @ origin/integration 5a230659)

- class extends expression carriers: `extends mixin(B)`, `extends a.b`, `extends a.b.c`, `extends f()`, `extends f(a.b)`,
  `extends mixin(B).x`, `extends (a)`, `extends (a, b)`, `extends (a ? B : C)`, `extends null`, `extends A<B>` regression,
  `extends A implements I.J` (mixed clauses).
- implements: `implements I.J`, `I.J.K`, `I<J>`, `A, B<C>`, `A, B, C<D>`, `implements mixin(B)`.
- interface extends: `extends A.B`, `A<B>`, `A, B<C>`, `A.B<C>`.
- trivia: comments around the expression, inside call args, around `.`, around type arguments, and a decorated member body.
- implementation (members/heritage-clause-shape BuildClauses): expression carrier branch for
  `(expr)` / `name.member` / `name(...)`, parsed with ExpressionBuilder (limited at `<` so `A.B<C>` yields
  PropertyAccessExpression + TypeReference type args); plain `name` + optional `<type args>` keeps the TypeBuilder path;
  `null` goes through the expression path so the child kind matches TS NullKeyword.
- readings: declarations 398/398 (baseline 365 + 33); full suite 3177/3177 (baseline 3144); tsc 0 error.

### deferred
- generic call in heritage (`extends mixin<T>(B)`), arrow/object-literal expressions in heritage, heritage with
  type arguments on call expressions beyond `A.B<C>`: needs more expression grammar; deferred.
