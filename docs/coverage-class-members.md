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

## chunk 7 (construct signatures + heritage generic call, branch cover-construct-sig-1 @ origin/integration 3168b495)

- construct signatures: `type T = { new (): A }`, `{ new (a: A): B }`, `{ new (a: A, b: B): C }`, `{ new <U>(a: U): A }`,
  `{ new <U, V>(a: U, b: V): C }`, `interface I { new (): A; }`, `{ new (a: A): B; }`, `{ new <T>(a: T): A; }`.
- abstract-new recovery: `type T = { abstract new (): A }` -> TS yields MethodSignature named "new" with AbstractKeyword.  
- mixed members: `{ (): A; new (): B; x: C }`, `interface I { new (): A; m(): void; }`, property named `new` regression.
- heritage generic call: `class C extends mixin<T>(B)`, `(mixin<T>(B))`, `mixin<T, U>(B)`, `mixin<T>(B, C2)`,
  `a.b<T>(B)`, `mixin<T>(B).x`, `interface I extends mixin<T>(B)` + trivia.
- implementation: TypeBuilder.ParseTypeMember gains a `new` branch (ConstructSignatureShape with TypeParameters/Parameters/
  ReturnType, TS children order) and the `abstract new` recovery; heritage BuildClauses detects generic calls
  (`<...>` followed by `(`) and lets ExpressionBuilder parse the whole call, otherwise it still stops before type args.
- readings: types 322/322 (baseline 302 + 20); declarations 441/441 (baseline 430 + 11); full suite 3318/3318 (baseline 3287 + 31); tsc 0 error.

### deferred
- constructor types with abstract (`abstract new () => A`), construct signature with modifiers other than abstract,
  heritage generic call with explicit type arguments on parenthesized member access: deferred.

## chunk 8 (method return predicates, branch cover-method-predicates-1 @ origin/integration d8077d98)

- class methods: `m(x: any): x is A`, `asserts x is A`, untyped param `x is A`, `static m`, two-param predicate,
  `m(): this is A`, `get x(): asserts this is A`, two methods (predicate + assert) in one class + trivia.
- interface method signatures: `m(x: any): x is A`, `asserts x is A`, mixed with normal methods.
- type-literal method signatures: `{ m(x: any): x is A }`, `asserts`, `this is A`, mixed, trivia.
- implementation: class-declaration-shape method return type uses TypeBuilder.ParseReturnType();
  TypeBuilder method-signature return type likewise; ParseTypePredicate now emits ThisTypeShape for `this`
  (it previously produced Identifier, so `this is A` did not match TS ThisType).
- readings: types 336/336 (baseline 331 + 5); declarations 482/482; full suite 3438/3438; tsc 0 error.

### deferred
- parameter decorators `constructor(@dec x: A)` / `m(@dec x: A)`: needs decorator-prefix handling inside
  TypeBuilder.ParseParameter (decorator expression delimiting before the parameter name). Patch attempted then reverted
  to keep the suite green; belongs to a later parameter-decorator chunk.
- object literal method predicates `({ m(x: any): x is A { ... } })`: needs expression-builder object-literal method support;
  expression family scope.

## chunk 9 (generic class/interface declarations, branch cover-generic-class-1 @ origin/integration f1ebc831)

- generic classes: `class C<T>`, `<T extends A>`, `<T = A>`, `<T extends A = B>`, `<T, U>`, `<T, U extends A = B>`,
  `class C<T> extends B<T>`, `class C<T> implements I<T>`, both clauses, member types `m(x: T): T`, generic member bodies.
- generic interfaces: `interface I<T>`, `<T extends A>`, `<T = A>`, `interface I<T> extends J<T>`, members using T,
  `interface I<T, U> extends J<T>, K<U>`.
- namespace bodies: `namespace N { class C<T> {} }` and `namespace N { interface I<T> { ... } }`.
- trivia: comments around `<`, inside parameter list, around `extends`, and a multi-line parameter list.
- implementation: Class/InterfaceDeclarationShape.FromUnits parse the type parameter list with
  `TypeBuilder.ParseTypeParameterList()` right after the name (children order = Identifier, TypeParameter[], HeritageClause[], members),
  and compute the heritage base from the last consumed type-parameter token; possible-shape stages needed no change (`<`/`>` are Symbols).
- readings: declarations 524/524 (baseline 496 + 28); full suite 3551/3551 (baseline 3523); tsc 0 error.

### deferred
- class expression with type parameters `(class<T> {})`: expression-builder class-expression path has no type parameter list; expressions family.
- nested type parameter `class C<T<U>> {}`: TypeBuilder.ParseTypeParameterList splits the combined `>>` token only in some paths;
  deferred to a focused type-parameter chunk (regular `<T, U>` lists are covered).

## chunk 10 (class member modifiers 2, branch cover-member-mods-2 @ origin/integration 938105f1)

- definite assignment assertions: `x!: A;`, `y!: A = b;`, `static x!: A;`, `#x!: A;`, `public x!: A;`, `readonly x!: A;`,
  two such members in one class, and trivia around `!` (the `!` is ExclamationToken, not a keyword; TS pos/end verified).
- `declare` fields: `declare x: A;`, `declare x: A = b;`, trivia.
- `override`: `override m() {}`, `override x = 1;`, `override get x() { return 1; }`, trivia.
- abstract accessors: `abstract get x(): A;`, `abstract set x(v: A);`, both in one class, trivia.
- modifier order combos: `public override readonly x = 1;`, `protected static readonly y: A;`, `private override m() {}`,
  `public static override readonly z: A = b;`.
- implementation: property branch in ClassDeclarationShape.BuildMembers consumes a `!` symbol after the name and builds
  `ExclamationTokenShape` (punctuation family, existing class) as a child between the name and the type annotation;
  modifier loop/order needed no change (declare/override/abstract/modifiers were already accepted and ordered by TS),
  abstract accessors were already green via the existing accessor branch.
- readings: declarations 587/587 (baseline 562 + 25); full suite 3666/3666 (baseline 3641); tsc 0 error.

### deferred
- optional property question token `x?: A` (QuestionToken child): same pattern as `!`, not in this round scope.
- definite assignment on parameter properties (`constructor(public x!: A)`): parameter-property path separate; later chunk.

## chunk 11 (optional properties + optional parameter properties, branch cover-member-mods-3 @ origin/integration c2846827)

- optional class properties: `x?: A;`, `static x?: A;`, `#x?: A;`, `public x?: A;`, `readonly x?: A;`,
  `x?: A = b;`, two optional members, trivia around `?`/`:`; QuestionToken is a child between name and type
  (lexer may hand a combined `?:` symbol: the shape covers only the `?` character, matching TS).
- optional parameter properties: `constructor(public x?: A) {}`, `private readonly y?: B`, `public x: A, private y?: B`.
- parameter property with initializer (bonus, was red): `constructor(readonly y = 1) {}`.
- regression: `x!: A | B;`, `x!: A = b;` (definite assignment from previous chunk).
- implementation: property branch consumes `?`/`?:` into QuestionTokenShape (partial range for the combined token,
  same technique as TypeBuilder.ParseOptionalMark), and the type block uses the remembered colon position;
  BuildParameters property-parameter branch now handles optional mark, optional type and an initializer child.
- readings: declarations 651/651 (baseline 635 + 16); full suite 3768/3768 (baseline 3752); tsc 0 error.

### deferred
- parameter property definite assignment `constructor(public x!: A)`: invalid TypeScript; the oracle recovery AST contains
  degenerate empty Parameter nodes (e.g. `Parameter [30,30) Identifier [30,30)`), so matching it byte-for-byte has no value.

## chunk 12 (auto-accessor members, branch cover-accessor-1 @ origin/integration 4fa193e7)

- auto-accessors: `accessor x = 1;`, `accessor x: A;`, `accessor x: A = b;`, `static accessor y = 2;`,
  `accessor #z = 3;`, two accessors in one class, accessor next to a method.
- modifier combinations: `public accessor x = 1;`, `protected accessor x: A;`, `private static accessor y: A;`,
  `readonly accessor z = 1;` (oracle AST keeps ReadonlyKeyword + AccessorKeyword), `abstract accessor w: A;`,
  `declare accessor v: A;`, decorated `@dec accessor y = 1;`, `@dec public accessor y = 1;`.
- regression: get/set accessors, plain property, modifier order property.
- trivia: comments before `accessor`, between `accessor` and name, before `=`, after modifiers, after decorator.
- FINDING: no implementation change was needed. Auto-accessors already parse through the existing member modifier loop
  (BuildModifier maps `accessor` to AccessorKeywordShape) + property branch; the probe with ts.createSourceFile confirmed
  TS child order modifiers -> AccessorKeyword -> name -> type -> initializer, and every probe form was structurally
  identical before any edit. This chunk is pure regression coverage (25 cases) + oracle verification.
- readings: declarations 676/676 (baseline 651 + 25); full suite 3887/3887 (baseline 3862); tsc 0 error.

### deferred
- none: all requested forms (including `readonly accessor`, `abstract accessor`, `declare accessor`, `@dec accessor`)
  are covered and green.
  note: `readonly accessor` / `declare accessor` are semantically questionable TypeScript but the oracle AST is stable,
  and AST-shape equality is what this suite measures.

## chunk 13 (decorator matrix, branch cover-decorators-matrix-1 @ origin/integration f5294c44)

- decorator expressions (probe + final): `@dec`, `@dec()`, `@dec(a, b)`, `@a.b`, `@a.b()`, `@(expr)`, `@new F()` all already green
  before this chunk; no expression-shape change was needed.
- RED -> GREEN (one fix): `@dec export class C {}` and `@dec export abstract class C {}` were red ("class keyword missing").
  TS oracle: legal, one ClassDeclaration whose children are Decorator(s), ExportKeyword, AbstractKeyword?, Identifier.
  Fix in ClassDeclarationShape.FromUnits: the modifier run now also accepts `export` (single occurrence) between the
  decorator prefix and declare/abstract, and the construction loop emits ExportKeywordShape in the same child order.
- stacking: `@a @b @c class C {}`, member `@a @b m() {}`, `@a /* c */ @b class C {}`.
- target matrix: class, abstract class, method, static method, get, set, property, static property, accessor,
  parameter (`constructor(@p x: A)`), multiple parameter decorators (`@dec @dec2 x`), decorated abstract overload
  signature (`@dec abstract m(): A;`), decorated implementation after an abstract signature.
- ordering: `@dec public m() {}` green; `@dec /* c */ public m() {}` green.
- trivia: `@ /* c */ dec`, `@dec /* c */ class C {}`, `@dec\\nclass C {}` (now green after the ASI edge work), comments between decorators.
- readings: declarations 688/688 (baseline 683 + 5 net after dedupe/removals); full suite 4017/4017 (baseline 4012); tsc 0 error.

### deferred
- `class C { static @dec m() {} }`: invalid TypeScript (diagnostic "Decorators must precede the name and all keywords"),
  recovery splits it into two members; not worth matching.
- `@a[0] class C {}` / `@c[0]` in a stack: element access is not a legal decorator expression; TS recovery produces
  MissingDeclaration + ExpressionStatement + ArrayLiteralExpression and splits the decorator; parked.
- `export @dec class C {}` and `export default @dec class C {}`: legal TS (ExportKeyword then Decorator inside one
  ClassDeclaration) but the export/module path is outside this chunk (export/import family); parked with comments.
- `@await f() class C {}`: oracle rejects (await is not a decorator expression).

## chunk 14 (member modifier/decorator orders + qualified heritage, branch cover-member-orders-1 @ origin/integration 96a1c024)

- FINDING: no implementation change was needed this round. The probe (21 forms) showed only 2 red entries and both are
  invalid TypeScript; every legal form asked for was already structurally identical before any edit.
- modifier order matrix (all green pre-existing): `public static override readonly x = 1;`, `protected abstract m(): void;`,
  `declare readonly x: A;`, `private static readonly y = 1;`, `async *m()`, `static async *g()`, `public async m()`,
  `override async m()`, `override async *m()`.
- decorator placement: `@dec public static readonly x = 1;`, `@dec private m()`, `@a @b public m()`, trivia between
  decorator and modifiers.
- qualified heritage + type args: `extends a.B`, `extends a.B<X>`, `implements a.I<X>`, `interface I extends a.J<K>`,
  `extends a.b.C<X, Y> implements I<Z>` (uses the heritage expression-carrier path from chunk 6).
- abstract members in one class: `abstract m(): void; abstract x: A; abstract get g(): A;`, plus
  `public abstract x: A; protected abstract m(): void;`.
- trivia: comments after decorators, between modifiers, before qualified heritage names, inside type arguments.
- readings: declarations 732/732 (baseline 726 + 6 net after dedupe); full suite 4140/4140 (baseline 4134); tsc 0 error.

### deferred
- `class C { public @dec m() {} }` and `class C { static @dec m() {} }`: invalid TypeScript
  (diagnostic "Decorators must precede the name and all keywords of property declarations."); recovery splits the member, parked.
- full abstract-accessor matrix (abstract set, protected abstract get) stays with the earlier accessor chunk.

## chunk 15 (decorated export default class, branch cover-class-export-decorators-1 @ origin/integration f62fca13)

- RED -> GREEN: `@dec export default class C {}`, `@dec export default abstract class C {}`,
  `@a @b export default class C {}`, `@a @b export default abstract class C {}`, `@dec export default class C<T> {}`,
  `@dec export default class C<T extends A> implements I {}`, `@dec export default class C extends B {}`,
  `@dec export default class C { x = 1 }`, `@dec export default class C { m() {} }` (9 forms).
  Before the fix they all failed inside the class shape with "class keyword missing".
- TS oracle (diagnostics=0): one ClassDeclaration; children = Decorator(s) -> ExportKeyword -> DefaultKeyword?
  -> AbstractKeyword? -> Identifier -> (type params | heritage | body).
- Fix (class-declaration-shape only): the modifier run now also accepts one `default` after `export`, and the
  construction loop emits DefaultKeywordShape between ExportKeyword and Declare/Abstract; class possible-shape needed
  no change (its decorator Stage 6 already continues over `export`/`default` until `class`).
- regression kept green: `export @dec class C {}`, `export default @dec class C {}`, `@dec class C {}`,
  `@dec export class C {}`, `@dec export abstract class C {}`, `@dec export class C<T> extends B {}`.
- trivia: comments between decorator/export, between export/default, between default/class, between default/abstract,
  stacked decorators across a newline.
- readings: declarations 779/779 (baseline 761 + 18 net after dedupe); full suite 4105/4105 (baseline 4087); tsc 0 error.

### deferred
- none for the target family; all requested forms are green. `@dec export default` with a class body/type params/heritage
  was included and stayed green with the same child order.

## chunk 16 (SemicolonClassElement, branch cover-semicolon-elements-1 @ origin/integration 0bc3408c)

- FINDING: `SemicolonClassElementShape` existed but was never wired into the class member loop - bare `;` members
  were silently skipped, so the TS node was missing from the cj tree. This chunk closes the audit's last
  "implemented but unmeasured" kind.
- RED -> GREEN: `class C { ; }`, `{ ; ; }`, `{ ; ; ; }`, `{ ; x = 1; }`, `{ x = 1; ; m() {} }`, `{ x = 1; ; }`,
  `{ m() {} ; }`, `extends B { ; }`, `{ static { } ; }`, `{ constructor() {} ; }` (all lacked the node before).
- TS oracle: SemicolonClassElement has NO children; range starts right after the previous token (leading trivia)
  and ends after the `;` (e.g. `class C { ; }` -> [9,11)); the class members array includes it in source order.
- Fix (class-declaration-shape only): the member loop now builds SemicolonClassElementShape for a bare `;`
  (SignIn/SignOut on the `;`, Pos = previousEnd + 1) and pushes it into members instead of skipping.
- regression: empty body `class C {}`, body with only a block comment, body with only a line comment.
- trivia: `/* c */ ;`, `; /* c */`, `; /* c */ ;`, multi-line body, `x = 1; /* c */ ; m() { }`.
- readings: declarations 814/814 (baseline 797 + 17 net after dedupe); full suite 4230/4230 (baseline 4213); tsc 0 error.

### deferred
- none: every requested semicolon placement is green. `static { } ;` and the EOF variant are covered.
## 分支合并补记（docs 补全，数据由 git 推导）
> 用例行增量取 `git diff <merge>^1 <merge> -- typescript/cases/*.ts` 的 numstat（仅 .ts）；
> 实现文件取 `git diff --name-only <merge>^1 <merge> -- typescript/tokens`；tip = `git rev-parse <merge>^2`。
> 合并提交未记录 deferred，详见对应分支提交与报告。
- `cover-static-mods-1` @ `fa802f67` — (static block modifiers)；cases +16/-0（declarations）；impl: class-declaration-shape
- `cover-static-block-1` @ `86c7816f` — (class static blocks measurement)；cases +38/-1（declarations）；impl: 
- `cover-fn-param-decorators-1` @ `afcfea7d` — (function parameter decorators)；cases +29/-1（declarations）；impl: function-declaration-shape
- `cover-param-decorators-1` @ `d7d8a97f` — (parameter decorators)；cases +26/-1（declarations）；impl: class-declaration-shape,type-builder
- `cover-obj-method-preds-1` @ `c990383a` — (object literal method predicates)；cases +18/-0（members）；impl: expression-builder