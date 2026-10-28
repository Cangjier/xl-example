# 81 — keywords（84 个关键字形状）

审计范围：`typescript/tokens/keywords/*.xl.md` 共 84 个。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：84 个文件里 81 个只有构造函数（1 行代码），3 个（`abstract`/`declare`/`export`）多一个 `FromBasicToken` 静态工厂。**没有一个**有 possible、end、`Close` 覆盖或 `ComputePossibleShapes` 覆盖，所以 `C1/C2/P1–P4/R1/R2/B2/B4` 一族与它们无关。

两类偏离：

1. **44 个关键字形状全仓零实例化**：`if`、`else`、`for`、`while`、`return`、`break`、`continue`、`throw`、`try`、`catch`、`finally`、`switch`、`case`、`class`、`function`、`enum`、`interface`、`extends`、`implements`、`var`、`let`、`import`、`from`、`namespace`、`module`、`type`、`is`、`as`、`keyof`、`typeof`、`unique`、`infer`、`satisfies`、`of`、`global`、`defer`、`delete`、`do`、`with`、`package`、`require`、`using`、`assert`、`yield`。TS 的 AST 里这些关键字都是语句/声明节点的 **children**（`IfStatement.children` 里有 `IfKeyword`、`ReturnStatement.children` 里有 `ReturnKeyword`），本仓却从没有一处 `new` 它们——`R18` 的同构在这一维同样空缺。
2. **40 个关键字形状的实例化点全在建造器**：`class-declaration-shape`、`type-builder`、`member-shell-catalog`、`expression-builder`、`statement-shape-ast`、`direct-*` 里成片的 `new XxxKeywordShape(...)`。也就是说「关键字形状」不是由 possible 的 `BuildByIndex` 造出来的（`R31` 的正规路径），而是由各建造器按需造——这些建造器正是第 20/30/40/50 篇里判为 `S4`/`X2` 的旁路。

正向证据：`abstract`/`declare`/`export` 三个的 `FromBasicToken` 是 `R31` 的标准形态（签范围 → 取 `Pos` → `TryToClose`，`abstract-keyword-shape.xl.md:24-37`）。

> 下表的「外部引用点」由 `tmp/refs.mjs` 全仓符号检索得出（只算类名出现在自身文件之外的位置）。`refs=0` 即「零实例化」。

| # | 文件 | 类 | 字节 / 代码行 | 外部引用点 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 1 | `abstract-keyword-shape.xl.md` | `AbstractKeywordShape` | 1069 / 12 | 9 处（`class-declaration-shape:388,471`、`module-block-shape:710`、`statement-builder:534` 等） | 符合（`FromBasicToken` = R31） |
| 2 | `accessor-keyword-shape.xl.md` | `AccessorKeywordShape` | 327 / 1 | 2 处（`class-declaration-shape:477`） | 符合（有实例化） |
| 3 | `any-keyword-shape.xl.md` | `AnyKeywordShape` | 317 / 1 | 3 处（`type-builder:716`） | 符合 |
| 4 | `as-keyword-shape.xl.md` | `AsKeywordShape` | 315 / 1 | **0** | `X1` ○ 零实例化；`S3` ○ `AsKeyword` 永不出现 |
| 5 | `assert-keyword-shape.xl.md` | `AssertKeywordShape` | 323 / 1 | **0** | `X1` ○ 零实例化；`S3` ○ |
| 6 | `asserts-keyword-shape.xl.md` | `AssertsKeywordShape` | 325 / 1 | 2 处（`type-builder:2116`） | 符合 |
| 7 | `async-keyword-shape.xl.md` | `AsyncKeywordShape` | 321 / 1 | 29 处（`class-declaration-shape:479`、`export-declaration-possible-shape:1174` 等） | 符合 |
| 8 | `await-keyword-shape.xl.md` | `AwaitKeywordShape` | 321 / 1 | 5 处（`direct-control-session:836`、`statement-builder:1988`） | 符合 |
| 9 | `big-int-keyword-shape.xl.md` | `BigIntKeywordShape` | 323 / 1 | 2 处（`type-builder:722`） | 符合 |
| 10 | `boolean-keyword-shape.xl.md` | `BooleanKeywordShape` | 325 / 1 | 2 处（`type-builder:721`） | 符合 |
| 11 | `break-keyword-shape.xl.md` | `BreakKeywordShape` | 321 / 1 | **0** | `X1` ○ 零实例化；`S3` ○ |
| 12 | `case-keyword-shape.xl.md` | `CaseKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○ |
| 13 | `catch-keyword-shape.xl.md` | `CatchKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 14 | `class-keyword-shape.xl.md` | `ClassKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 15 | `const-keyword-shape.xl.md` | `ConstKeywordShape` | 321 / 1 | 10 处（`enum-declaration-shape:195`、`module-block-shape:583`） | 符合 |
| 16 | `constructor-keyword-shape.xl.md` | `ConstructorKeywordShape` | 333 / 1 | 3 处（`member-shell-catalog:457,642`） | 符合 |
| 17 | `continue-keyword-shape.xl.md` | `ContinueKeywordShape` | 327 / 1 | **0** | `X1` ○；`S3` ○ |
| 18 | `debugger-keyword-shape.xl.md` | `DebuggerKeywordShape` | 327 / 1 | **0** | `X1` ○；`S3` ○ |
| 19 | `declare-keyword-shape.xl.md` | `DeclareKeywordShape` | 919 / 11 | 45 处（`class-declaration-shape:383`、`export-declaration-possible-shape` 等） | 符合（`FromBasicToken` = R31） |
| 20 | `default-keyword-shape.xl.md` | `DefaultKeywordShape` | 325 / 1 | 21 处（`export-declaration-possible-shape:840,914` 等） | 符合 |
| 21 | `defer-keyword-shape.xl.md` | `DeferKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 22 | `delete-keyword-shape.xl.md` | `DeleteKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○（`delete` 前缀表达式由 `Symbol` 文本处理） |
| 23 | `do-keyword-shape.xl.md` | `DoKeywordShape` | 315 / 1 | **0** | `X1` ○；`S3` ○ |
| 24 | `else-keyword-shape.xl.md` | `ElseKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○ |
| 25 | `enum-keyword-shape.xl.md` | `EnumKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○ |
| 26 | `export-keyword-shape.xl.md` | `ExportKeywordShape` | 915 / 11 | 41 处（`export-declaration-possible-shape:670`、`export-inner-declaration-delegate:44`） | 符合（`FromBasicToken` = R31） |
| 27 | `extends-keyword-shape.xl.md` | `ExtendsKeywordShape` | 325 / 1 | **0** | `X1` ○；`S3` ○（`heritage-clause-shape:72` 只用文本判 `extends`） |
| 28 | `false-keyword-shape.xl.md` | `FalseKeywordShape` | 321 / 1 | 14 处（`direct-token-util:155`、`expression-builder:2490`） | 符合 |
| 29 | `finally-keyword-shape.xl.md` | `FinallyKeywordShape` | 325 / 1 | **0** | `X1` ○；`S3` ○ |
| 30 | `for-keyword-shape.xl.md` | `ForKeywordShape` | 317 / 1 | **0** | `X1` ○；`S3` ○ |
| 31 | `from-keyword-shape.xl.md` | `FromKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○（import/export 的 `from` 只按文本判） |
| 32 | `function-keyword-shape.xl.md` | `FunctionKeywordShape` | 327 / 1 | **0** | `X1` ○；`S3` ○ |
| 33 | `get-keyword-shape.xl.md` | `GetKeywordShape` | 317 / 1 | 2 处（`member-shell-catalog:440`） | 符合 |
| 34 | `global-keyword-shape.xl.md` | `GlobalKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○ |
| 35 | `if-keyword-shape.xl.md` | `IfKeywordShape` | 315 / 1 | **0** | `X1` ○；`S3` ○ |
| 36 | `implements-keyword-shape.xl.md` | `ImplementsKeywordShape` | 331 / 1 | **0** | `X1` ○；`S3` ○ |
| 37 | `import-keyword-shape.xl.md` | `ImportKeywordShape` | 323 / 1 | 7 处（`expression-builder:2472`、`call-possible-shape:206`、`statement-shape-ast:192`） | 符合 |
| 38 | `in-keyword-shape.xl.md` | `InKeywordShape` | 315 / 1 | 8 处（`operator-shape-map:235`、`right-operand-possible-shape:176`） | 符合 |
| 39 | `infer-keyword-shape.xl.md` | `InferKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 40 | `instance-of-keyword-shape.xl.md` | `InstanceOfKeywordShape` | 331 / 1 | 6 处（`operator-shape-map:232`、`right-operand-possible-shape:173`） | 符合 |
| 41 | `interface-keyword-shape.xl.md` | `InterfaceKeywordShape` | 329 / 1 | **0** | `X1` ○；`S3` ○ |
| 42 | `intrinsic-keyword-shape.xl.md` | `IntrinsicKeywordShape` | 329 / 1 | 2 处（`type-builder:730`） | 符合 |
| 43 | `is-keyword-shape.xl.md` | `IsKeywordShape` | 315 / 1 | **0** | `X1` ○；`S3` ○（类型谓词的 `is` 由 `type-predicate-shape` 直接建，见第 42 篇） |
| 44 | `key-of-keyword-shape.xl.md` | `KeyOfKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 45 | `let-keyword-shape.xl.md` | `LetKeywordShape` | 317 / 1 | **0** | `X1` ○；`S3` ○ |
| 46 | `module-keyword-shape.xl.md` | `ModuleKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○ |
| 47 | `namespace-keyword-shape.xl.md` | `NamespaceKeywordShape` | 329 / 1 | **0** | `X1` ○；`S3` ○ |
| 48 | `never-keyword-shape.xl.md` | `NeverKeywordShape` | 321 / 1 | 2 处（`type-builder:735`） | 符合 |
| 49 | `new-keyword-shape.xl.md` | `NewKeywordShape` | 317 / 1 | 2 处（`member-shell-catalog:451`） | 符合 |
| 50 | `null-keyword-shape.xl.md` | `NullKeywordShape` | 319 / 1 | 14 处（`expression-builder:2493`、`binary-operator-possible-shape:232`） | 符合 |
| 51 | `number-keyword-shape.xl.md` | `NumberKeywordShape` | 323 / 1 | 4 处（`parameter-list-possible-shape:619`、`type-builder:736`） | 符合 |
| 52 | `object-keyword-shape.xl.md` | `ObjectKeywordShape` | 323 / 1 | 2 处（`type-builder:739`） | 符合 |
| 53 | `of-keyword-shape.xl.md` | `OfKeywordShape` | 315 / 1 | **0** | `X1` ○；`S3` ○（`for…of` 只按文本判 `of`） |
| 54 | `out-keyword-shape.xl.md` | `OutKeywordShape` | 317 / 1 | 2 处（`type-builder:2716`） | 符合 |
| 55 | `override-keyword-shape.xl.md` | `OverrideKeywordShape` | 327 / 1 | 2 处（`class-declaration-shape:475`） | 符合 |
| 56 | `package-keyword-shape.xl.md` | `PackageKeywordShape` | 325 / 1 | **0** | `X1` ○；`S3` ○ |
| 57 | `private-keyword-shape.xl.md` | `PrivateKeywordShape` | 325 / 1 | 3 处（`class-declaration-shape:465`、`member-shell-catalog:285`） | 符合 |
| 58 | `protected-keyword-shape.xl.md` | `ProtectedKeywordShape` | 329 / 1 | 2 处（`class-declaration-shape:469`） | 符合 |
| 59 | `public-keyword-shape.xl.md` | `PublicKeywordShape` | 323 / 1 | 2 处（`class-declaration-shape:467`） | 符合 |
| 60 | `readonly-keyword-shape.xl.md` | `ReadonlyKeywordShape` | 327 / 1 | 5 处（`class-declaration-shape:461`、`type-builder:2535`） | 符合 |
| 61 | `require-keyword-shape.xl.md` | `RequireKeywordShape` | 325 / 1 | **0** | `X1` ○；`S3` ○ |
| 62 | `return-keyword-shape.xl.md` | `ReturnKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○ |
| 63 | `satisfies-keyword-shape.xl.md` | `SatisfiesKeywordShape` | 329 / 1 | **0** | `X1` ○；`S3` ○ |
| 64 | `set-keyword-shape.xl.md` | `SetKeywordShape` | 317 / 1 | 2 处（`member-shell-catalog:443`） | 符合 |
| 65 | `static-keyword-shape.xl.md` | `StaticKeywordShape` | 323 / 1 | 3 处（`class-declaration-shape:463,971`） | 符合 |
| 66 | `string-keyword-shape.xl.md` | `StringKeywordShape` | 323 / 1 | 2 处（`type-builder:742`） | 符合 |
| 67 | `super-keyword-shape.xl.md` | `SuperKeywordShape` | 321 / 1 | 9 处（`expression-builder:2372`、`member-chain-judge:220`） | 符合 |
| 68 | `switch-keyword-shape.xl.md` | `SwitchKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○ |
| 69 | `symbol-keyword-shape.xl.md` | `SymbolKeywordShape` | 323 / 1 | 2 处（`type-builder:743`） | 符合 |
| 70 | `this-keyword-shape.xl.md` | `ThisKeywordShape` | 319 / 1 | 12 处（`expression-builder:2496`、`binary-operator-possible-shape:224`） | 符合 |
| 71 | `throw-keyword-shape.xl.md` | `ThrowKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 72 | `true-keyword-shape.xl.md` | `TrueKeywordShape` | 319 / 1 | 15 处（`expression-builder:2487`、`binary-operator-possible-shape:226`） | 符合 |
| 73 | `try-keyword-shape.xl.md` | `TryKeywordShape` | 317 / 1 | **0** | `X1` ○；`S3` ○ |
| 74 | `type-keyword-shape.xl.md` | `TypeKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○ |
| 75 | `type-of-keyword-shape.xl.md` | `TypeOfKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○（`typeof` 走 `type-operator-shape` / `Symbol` 文本） |
| 76 | `undefined-keyword-shape.xl.md` | `UndefinedKeywordShape` | 329 / 1 | 2 处（`type-builder:757`） | 符合 |
| 77 | `unique-keyword-shape.xl.md` | `UniqueKeywordShape` | 323 / 1 | **0** | `X1` ○；`S3` ○ |
| 78 | `unknown-keyword-shape.xl.md` | `UnknownKeywordShape` | 325 / 1 | 2 处（`type-builder:756`） | 符合 |
| 79 | `using-keyword-shape.xl.md` | `UsingKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 80 | `var-keyword-shape.xl.md` | `VarKeywordShape` | 317 / 1 | **0** | `X1` ○；`S3` ○ |
| 81 | `void-keyword-shape.xl.md` | `VoidKeywordShape` | 319 / 1 | 2 处（`type-builder:760`） | 符合 |
| 82 | `while-keyword-shape.xl.md` | `WhileKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |
| 83 | `with-keyword-shape.xl.md` | `WithKeywordShape` | 319 / 1 | **0** | `X1` ○；`S3` ○（`with {…}` 的类型由 `import-attributes-shape` 承担） |
| 84 | `yield-keyword-shape.xl.md` | `YieldKeywordShape` | 321 / 1 | **0** | `X1` ○；`S3` ○ |

---

## 本批统计

- 文件数：84；有偏离：44（全部为疑似 `○`）；符合：40。
- 按编号计数：`X1:44`、`S3:44`（一文件两条，合计 88 条）。
- 零实例化清单（44）：`as` `assert` `break` `case` `catch` `class` `continue` `debugger` `defer` `delete` `do` `else` `enum` `extends` `finally` `for` `from` `function` `global` `if` `implements` `infer` `interface` `is` `keyof` `let` `module` `namespace` `of` `package` `require` `return` `satisfies` `switch` `throw` `try` `type` `typeof` `unique` `using` `var` `while` `with` `yield`。
- 本批最严重 3 条：
  1. `[X1]/[S3]` 控制流关键字形状（`if`/`else`/`for`/`while`/`return`/`break`/`continue`/`throw`/`try`/`catch`/`finally`/`switch`/`case`/`default`）几乎全部零实例化，形状树里没有这些 token 子节点。
  2. `[X1]` 声明关键字（`class`/`function`/`interface`/`enum`/`let`/`var`/`import`/`from`/`extends`/`implements`）同样零实例化——声明 AST 的 children 里不会有它们。
  3. `[X1]` 40 个已实例化的关键字全部由建造器（`type-builder`/`class-declaration-shape`/`member-shell-catalog`/`expression-builder`/`statement-shape-ast`/`direct-*`）直接 `new`，不经 possible（R31 的正规路径）。
