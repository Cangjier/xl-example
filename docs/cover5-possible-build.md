# cover5 possible-build（§6 第 5 类）报告

- 工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-possible-build`
- 分支：`cover5-possible-build`（从 `feature/quick-parse`，基线 HEAD `5362a38bffd3a94d605b321a95ac32f3fd02e34c`）
- 范围：**只改 `typescript/tokens/**`**（不动 `core/**`、不动 `IMPORTANCE.md`、不动其它类别 case 文件）
- oracle：TypeScript 6.0.3 `ts.createSourceFile`，**硬性口径 = `parseDiagnostics.length===0`** 且
  （本仓 crash 或 AST 三栏不一致）才算真红。
- 探针：`tmp/probe.mjs`（复用 `typescript/cases/ast-compare.mjs` 的 `tsAst/cjAst/flatten/groupByKind`，
  三栏：结构 / 位置 / 字段）；证据：`tmp/reds-possible-build.json`、`tmp/prefix-reds.txt`、
  `tmp/prefix-reds-optcall.txt`、`tmp/cover5-possible-build-log.md`（tmp 不进 git）。

## 1. 读数（修复后）

| 验证 | 读数 |
|---|---|
| `node typescript/cases/ast-json.mjs` | **5378 / cj-ok 5378 / cj-fail 0（47 构造）**（基线 5335 + 新增 43） |
| `node typescript/cases/ast-json-diff.mjs` | **5378/5378；结构差 0、位置差 0、字段差 0** |
| 单 stem `possible-build` | cases=155 cj-ok=155 cj-fail=0；150/150 完全一致（基线 112 + 新增 43） |
| `node typescript/cases/token-ast.mjs --quiet` | known-gap 0；non-known-gap 1704（**ok 1694 / ts-invalid 10**，与基线一致） |
| `node typescript/cases/real-dts-ast.mjs` | 文件 226：解析成功 226、崩溃 0；**AST 完全一致 226 / 有差异 0** |
| `tsc -p tsconfig.json` | 退出码 0，无输出 |
| TS 版本 | 6.0.3 |
| `git status`（改前/跟踪文件） | 只有 6 个 `.xl.md` + `possible-build.ts` + 两份快照 |

修复前回滚验证：把 6 处修复在编译产物里逐条还原后，新加 39 条候选（A–F 族）读数为
**ok=1 / crash=30 / diff=8**（`tmp/prefix-reds.txt`）；G 族在修复前单独实测 5/5 crash。
唯一没红的 1 条是 `<A<B<C> /*c*/ >>y`（`>>` 前另有一个 `>`，旧口径恰好对齐），**已剔除、未入用例**。

## 2. 问题清单（真红，均 TS parseDiagnostics=0）

> 四问对每族都给：正确何时 build / build 提什么 / 何时 close / close 提什么。
> 共同点：**候选的 possible 判定与 build 时机都是对的**（声明/语句/表达式已完整、唯一候选 Accept），
> 错在 `BuildByIndex → 形状/builder` 的提取口径；因此全部归 §6 第 5 类。

### A. 尖括号断言的嵌套泛型收口（`>>>` / `>>>>` 合符号）

- 复现：`const x1 = <A<B<C>>>y;`（`const x2 = <Array<Array<number>>>y;`、`<A<B<C<D>>>>y`、
  `<A/*c*/<B<C>>>y`、`f(<A<B<C>>>y);`、`return <A<B<C>>>y;` 同族）
- 修复前：**CRASH「尖括号断言里的类型没有读完」**
- TS vs 本仓：TS = `TypeAssertionExpression > TypeReference` 嵌套（`Array<Array<number>>` 里每层
  `TypeReference` 各自在对应 `>` 处收口），本仓 build 直接抛错、无 AST。
- 归类：possible build 不对（子形状边界 / End 取错单元）。
- 根因：`typescript/tokens/expressions/expression-builder.xl.md:2083` `ParseAngleType` +
  `:2126` `ParseAngleStart`。`AngleJudge.FindPair` 返回的是合符号 `>>>` 所在的**原单元**下标，
  该格交给 `TypeBuilder.Load` 后被拆成 3 个单字符 `>`；其中**最后一个** `>` 是断言自身的闭合，
  类型只能消费前 2 个。旧口径用 `last - first + 1`（原单元数）当期望消费数，只有 `>>`（n=2）
  恰好相等，n≥3 多出一格 ⇒ 误报「没有读完」。`as` / 类型实参路径用 `OriginalConsumed()`，不受影响。
- 四问：
  - 正确何时 build：不变（语句/表达式完整、唯一候选 Accept 的那一格）。
  - build 提什么：`<` / `>` 不投影；children = [Type, 被断言表达式]；期望消费数 =
    `builder.Units.length - (切片含合符号 ? 1 : 0)`。
  - 何时 close：不变（`SpanNode` 到操作数末单元）。
  - close 提什么：TypeAssertionExpression 区间从 `<` 到操作数末；子节点已就位。
- 修复：`ParseAngleType(first, last, includesClose)` 用展开后 unit 数减 1；`ParseAngleStart` 传
  `closeText.length > 1`。

### B. 枚举成员的计算名（ComputedPropertyName）

- 复现：`enum E5 { [k] }`、`{ [k] = 1 }`、`{ ["a"] }`、`{ [0] }`、`{ A = 1, [k] = 2, B = 3 }`、
  `{ /*c*/ [k] /*d*/ = 1 }`、`{ [k], [m] = 2 }`
- 修复前：**CRASH「枚举成员的名字不是标识符、字符串或数字」**
- TS vs 本仓：TS `EnumMember[8,12) > ComputedPropertyName[8,12) > Identifier[10,11)`；本仓 build 抛错。
- 归类：possible build 不对（build 期字段漏取）。
- 根因：`typescript/tokens/declarations/enum-declaration-shape.xl.md:185` `BuildMember` 只认
  `Common` / `String` 名字，`[` 括号直接抛。
- 四问：
  - 正确何时 build：不变（EnumDeclarationPossibleShape 在声明完整那一格 Accept）。
  - build 提什么：成员名是 `[` 括号时，括号内交 `ExpressionBuilder.ParseExpression` 读表达式，包成
    `ComputedPropertyName`（`[`/`]` 不进 children，SignIn/SignOut 覆盖整个方括号，Pos = 成员起点）；
    仍按 `=` 初始化器口径挂值。
  - 何时 close：不变（成员区间到名字/初始化器末单元，`TryToClose`）。
  - close 提什么：`EnumMember` children = [ComputedPropertyName, (初始化器表达式)]；`EnumDeclaration`
    children = [修饰词…, Identifier, EnumMember…]。
- 修复：`BuildMember` 增加 `Bracket` + `[` 分支（新增 `ComputedPropertyNameShape` 依赖）。

### C. import attribute 的值按表达式提取

- 复现：`import x1 from "m" with { type: json };`、`type: 1`、`` type: `t` ``、`type: 1 + 2`、
  `type: [1]`、`type: { a: 1 }`
- 修复前：**结构差**「Identifier -1、NumericLiteral -1、ArrayLiteralExpression -1、
  ObjectLiteralExpression -1、BinaryExpression -1」；模板串还多出 `StringLiteral +1`
  （TS 是 `NoSubstitutionTemplateLiteral`）。
- TS vs 本仓：TS `ImportAttribute` children = [Key, value 表达式]；本仓旧口径只有 `code[2]` 是
  `String` basic token 时才建 value，其它值整段丢；模板串被 `StringLiteralShape.FromBasicToken`
  错建成 `StringLiteral`。
- 归类：possible build 不对（build 期字段漏取/错取）。
- 根因：`typescript/tokens/members/import-attribute-shape.xl.md:33` `FromTokens`。
- 四问：
  - 正确何时 build：不变（ImportAttributesShape.FromBracket 在 `}` 括号到齐时建）。
  - build 提什么：`:` 之后整段是**一个表达式**（TS AssertEntry.value），交
    `ExpressionBuilder.ParseAssign` 读，作为 ImportAttribute 的最后一个 child；字符串仍是
    `StringLiteral`、模板串是 `NoSubstitutionTemplateLiteral`。
  - 何时 close：不变（FromBracket 处 `TryToClose`）。
  - close 提什么：ImportAttribute 区间到 value 末单元；ImportAttributes 区间覆盖 `{…}`。
- 修复：`Value` 字段类型 `Token | null`；新增 `ExpressionBuilder` 依赖。

### D. 参数装饰器之后的解构模式 / rest

- 复现：`function f1(@a { x }: T) {}`、`function f6(@a /*c*/ { x }: T) {}`、
  `class C2 { m(@a { x }: T) {} }`、`class C3 { m(@a [x]: T) {} }`、
  `class C4 { m(@a @b { x }: T) {} }`、`class C5 { constructor(@a [x]: T) {} }`、
  `class C7 { m(@a() [x]: T) {} }`
- 修复前：function 侧**位置差** `ObjectBindingPattern ts[14,20] cj[12,20]`（Pos 接到第一个 `@`）；
  class 侧 **CRASH「缺少标识符」**。
- TS vs 本仓：TS `Parameter > [Decorator[12,14), ObjectBindingPattern[14,20), TypeReference]`，
  模式 Pos = 最后一个装饰器 End+1；TS decorator context 里 `@a` 后**顶层** `[` 不是 element access
  （对照：`@a[b] class C {}` 的 TS 也把 decorator 截在 `a`，`[b]` 另起，parseDiagnostics=2 不入用例）。
- 归类：possible build 不对（build 期单元边界 + Pos）。
- 根因：三处 ——
  1. `typescript/tokens/types/type-builder.xl.md:1622` `ParseDecorators` 把 `@a [x]` 的 `[x]`
     当 element access 整段吃掉；
  2. `typescript/tokens/declarations/class-declaration-shape.xl.md:372` `BuildParameters` 的
     「装饰过的参数」分支只 `ParseName`（`:466` 起），解构模式 / `...` 直接「缺少标识符」；
  3. `function-declaration-shape.xl.md:422` / class 侧解构模式 Pos 用 `groupStart-1`
     （第一个 `@` 之前）而不是最后一个装饰器之后。
- 四问：
  - 正确何时 build：不变（参数表括号到齐那一格）。
  - build 提什么：装饰器表达式在**顶层 `[`** 处截断；装饰器之后的 `{` / `[` / `...` 交
    `TypeBuilder.ParseParameter`（它已支持 decorator + 模式 + rest），再把已消费的装饰器
    `unshift` 回 Parameter 最前并改 range/POS；解构模式 Pos = 最后一个装饰器 End+1。
  - 何时 close：不变（Parameter 的 `SpanNode`；有默认值时 `TakeParameterInitializer` 延长区间）。
  - close 提什么：Parameter children = [Decorator…, DotDotDotToken?, 模式/Identifier,
    QuestionToken?, Type, (Initializer)]。
- 修复：`ParseDecorators` 截断 + class/function `BuildParameters`。

### E. 参数属性的 rest（`constructor(private ...a: A[])`）

- 复现：`class R1 { constructor(private ...a: A[]) {} }`，及 `readonly` / `public` /
  `private /*c*/ ...` 变体
- 修复前：**CRASH「缺少标识符」**
- TS vs 本仓：TS `Parameter > [PrivateKeyword[22,29), DotDotDotToken[29,33),
  Identifier[33,34), ArrayType[35,39)]`；本仓在修饰词后直接 `ParseName`，`...` 被当名字。
- 归类：possible build 不对（build 期子形状漏建）。
- 根因：`class-declaration-shape.xl.md:415` 起（参数属性分支）。
- 四问：
  - 正确何时 build：不变（构造器形参表到齐）。
  - build 提什么：修饰词之后先认 `...` 建 `DotDotDotToken`（Pos 含前导 trivia）挂
    `Parameter.RestToken`，再读名字 / 可选 / 类型 / 默认值。
  - 何时 close：不变。
  - close 提什么：children 顺序 [修饰词, `...`, name, QuestionToken?, Type, (Initializer)]。
- 修复：`BuildParameters` 参数属性分支新增 rest 识别（新增 `DotDotDotTokenShape` 依赖）。

### F. 对象字面量可选方法（`{ m?() {} }`）

- 复现：`const o1 = { m?() {} };`、`{ m?(a) {} }`、`{ async m?() {} }`、`{ *m?() {} }`、
  `{ m? /*c*/ () {} }`、`{ m?(): void {} }`、`{ m?<T>(x: T): T { return x } }`、
  `{ "a-b"?() {} }`
- 修复前：**CRASH「缺少标识符」**（async / generator 形态是「对象字面量成员缺少函数体」）
- TS vs 本仓：TS `ObjectLiteralExpression > MethodDeclaration > [Identifier, QuestionToken[13,14),
  (Parameter?), Block]`；本仓名字后的 `?` 无人认领，落到属性/简写分支。
- 归类：possible build 不对（build 期子形状漏建）。
- 根因：`expression-builder.xl.md:1355` `ParseObjectLiteral`（成员分派只认 async/get/set/`*` 前缀
  与 name 后 `<` / `(`）。
- 四问：
  - 正确何时 build：不变（对象字面量 `}` 到齐）。
  - build 提什么：名字之后、类型参数之前，若 `?` / `?:` 后紧跟 `(` 或 `<`，建 `QuestionToken`
    （组合 `?:` 只覆盖 `?` 一格、Pos 含 trivia）插在 name 之后、TypeParameters 之前。
  - 何时 close：不变（成员区间到块体末）。
  - close 提什么：MethodDeclaration children 顺序 name → QuestionToken → TypeParameters →
    Parameters → ReturnType → Block。
- 修复：`ParseObjectLiteral`（`memberQuestionToken`；无体时仍报缺函数体）。

### G. 可选调用 + 显式类型参数（`a?.<T>(b)`）—— lead 由 missing-possible 转来

- 复现：`a?.<T>(b);`、`a?.<T, U>(b, c);`、`a?.<Array<T>>(b);`、`const ox = a?.<T>(b);`、
  `a?./*c*/<T>(b);`
- 修复前：**CRASH「缺少标识符」**（5/5）
- TS vs 本仓：TS `CallExpression > [Identifier, QuestionDotToken[1,3), TypeReference[4,5)…,
  args…]`（`(` / `)` 不投影）；本仓 `?.` 分支只认 `?.(` / `?.[` / `?.name`，`<` 落进 `ParseName`。
- 归类：possible build 不对（build 期语法形态漏建）。候选/收口都正确：`?.` 已在
  `AngleJudge.PredecessorAllows` 白名单、`<…>(` follower 也合法，缺的只是 `?.` 分支里的 build 支路。
- 根因：`expression-builder.xl.md:966`（`ParsePostfix` 的 `?.` 分支）。
- 四问：
  - 正确何时 build：不变（调用实参括号到齐）。
  - build 提什么：`?.` 后若下一格是 `<` 且 `AngleJudge.CanStart` 成立，先读类型实参，再要求紧跟
    实参括号；children = [expression, QuestionDotToken, TypeArguments…, args…]。
  - 何时 close：不变（`SpanNode` 到实参末）。
  - close 提什么：CallExpression 区间从被调用者起点到 `)`；`(` / `)` 不投影。
- 修复：`ParsePostfix` 的 `?.` 分支新增 `?.<…>(` 支路。

## 3. 修复文件与 cache 复用说明（IMPORTANCE §3.4）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/expressions/expression-builder.xl.md` | `ParseAngleType` / `ParseAngleStart`（A）、`ParseObjectLiteral`（F）、`ParsePostfix` 的 `?.` 分支（G） |
| `typescript/tokens/declarations/enum-declaration-shape.xl.md` | `BuildMember` 计算名分支（B），新增 `Bracket`/`ComputedPropertyNameShape` 依赖 |
| `typescript/tokens/members/import-attribute-shape.xl.md` | `FromTokens` 值表达式（C），`Value:Token | null` + `ExpressionBuilder` |
| `typescript/tokens/types/type-builder.xl.md` | `ParseDecorators` 装饰器表达式在顶层 `[` 截断（D） |
| `typescript/tokens/declarations/class-declaration-shape.xl.md` | `BuildParameters`：装饰参数的模式/rest（D）、参数属性 rest（E） |
| `typescript/tokens/declarations/function-declaration-shape.xl.md` | `BuildParameters`：解构模式 Pos 接在最后一个装饰器之后（D） |

**cache 复用**：本轮 7 处修复全部发生在「候选 Accept 之后由 `BuildByIndex` 调用的形状/builder」内部，
改动只消费**已装载的单元数组**（`this.Units` / `bracket.Data` / `code`），**没有新增**
`ItemUtil.ItemStart` 重扫、没有新增 `PossibleShapeCache` 槽位、没有改动 `ComputeByIndex`；
各形状原有的 `cache.GetState/SetState`（IMPORTANCE §3.4 的扫描下界）未受影响。
因此 build 与 compute 仍然读同一份 cache，未引入「建与判不一致」的新路径。

## 4. 新增用例（`typescript/cases/possible-build.ts` 末尾 cover5 round5 段）

- 新增 **43 行**（A 7 + B 6 + C 6 + D 7 + E 4 + F 8 + G 5），base 先行、trivia/重复形变体在后，
  一行一例；全部为「修复前红、修复后绿」的真红，基线已通过的形态未加入。
- 特意剔除的候选：`const x5 = <A<B<C> /*c*/ >>y;`（`>>` 前另有一个 `>`，旧口径恰好通过，非真红）。
- 用例里保留的注释按四问写「根因 / 正确 build / close 口径」，便于后续回归定位。
- 读数：单 stem `possible-build` 112 → **155** 条全绿；全量 5335 → **5378** 全绿。

## 5. lead 转来线索的裁定（不进本类用例）

| 线索 | 裁定 | 依据 |
|---|---|---|
| `FirstAssignment` kind ≠ `EqualsToken`（`x = 1 + 2;`） | **比较器别名归一问题，不是 AST/build 错，也不是真红** | `ts.SyntaxKind[EqualsToken]` 反查名就是 `FirstAssignment`；`ast-compare.mjs` 的 `TS_KIND_ALIASES` 把 TS 侧折成 `EqualsToken`，而 `groupByKind` 对**两侧**都调 `kindOf`，所以本仓 `FirstAssignmentShape` 的 kind 也被折成 `EqualsToken`。实测 `x = 1 + 2;` TS diag=0、三栏 0/0/0。快照 JSON 里 `cj-ast.json` 原样写 `FirstAssignment` 是命名约定，非 AST 差异。不改、不入 case。 |
| `a?.<T>(b)` | **确认是本类（G 族）**，已修 + 入用例 | TS diag=0、修复前 5/5 crash（「缺少标识符」）、`?.` 的 predecessor/follower 判据本就正确，缺的是 build 分支。 |
| `@dec enum E {}` | `缺少 possible`（第 2 类），非本类 | enum 声明候选不认 `@`，落到表达式候选 →「不支持的表达式起点」。 |
| `declare module "m" { import x from "n"; }` / `{ function f(); }` | `缺少 possible`（第 2 类），非本类 | `ModuleBlockShape.BuildMember` 没有 import 成员分支（docs 已记暂缓），交 `StatementBuilder` 后失败。 |
| `class C<T<U>> {}` / `interface I<T<U>> {}` | TS 自身非法（`',' expected`，diag=1） | 不满足硬性口径，不计红。 |

## 6. 需裁定 / 遗留

1. **import attribute 的非字符串值是 TS 恢复形**（`with { type: json }` 等）：TS diag=0 且 AST 稳定，
   本轮按表达式口径对齐；若后续认为只该支持字符串（语义层），可在 case 里标注降级，不影响现状全绿。
2. **`class C { m(@a [x]: T) {} }` 的装饰器截断规则**按 TS decorator context 实现（顶层 `[` 截断）。
   对照 `@a[b] class C {}` 是 TS 非法（diag=2、恢复拆成 MissingDeclaration），未入用例；
   若后续要覆盖类装饰器的恢复形，需要另立「TS 恢复图对齐」决策。
3. `possible-build` 的 190+ 条形状桩（`*-possible-shape.xl.md` 的 `BuildByIndex` 仍是
   `throw 未实现`）在现有架构下**不参与**解析（表达式整段交 builder）；本轮没有动它们，
   与 docs 既有结论一致。
4. `FirstAssignment` 等「别名形状族」的 kind 命名与 TS 规范名的统一（若需要）属投影/别名表层，
   不在本类；本轮只在报告里记录，未改 `ast-compare.mjs`。
