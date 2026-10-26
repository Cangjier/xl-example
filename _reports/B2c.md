# B2c · class/interface 成员 method / constructor / accessor / index 逐字目录 — 实施报告

| 项 | 值 |
| --- | --- |
| 状态 | **主修完成**：方法 / 构造器 / 访问器 / 索引签名 / 静态块 / interface 构造签名在成员第一格建对应外壳；子 token 各自在闭合格成形；最终 AST 仍由 legacy `BuildMembers` 产出 |
| 分支 | `feature/b2c-member-kinds` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b2c-member-kinds` |
| 基线 | 主仓库 `576f8005`（B2b 已合入；`c2bb8b77` 之后一条 docs 提交） |
| 提交 | 见 `git log --oneline -1`（ASCII） |

---

## 0. 一句话

B2b 的 `MemberHeadScan` 对 `(` / `<` / `[` / `{` / `@` / `*` / 换行一律返回 `-1`，所以方法 / 构造器 /
访问器 / 索引 / 静态块只能等到 `}` 一次性建。B2c 把前瞻升级为 **`Plan(unit) → { Kind, Modifiers }`**：
第一格就判出这六族 + interface 的 `new (`；外壳按种类建**同类型空壳**（`MethodDeclarationShape` /
`ConstructorShape` / `GetAccessorShape` / `SetAccessorShape` / `IndexSignatureShape` /
`ClassStaticBlockDeclarationShape` / `MethodSignatureShape` / `ConstructSignatureShape`），
名字在自己的闭合格成 `IdentifierShape`（`constructor` / `new` / `get` / `set` 成各自关键字形状），
参数表复用 B1 的 `ParameterListPossibleShape`，方法体 `{` 复用 B1b 的 `BlockShape`。
收口仍由族 legacy `BuildMembers` 消费，**没有新增建树路径**。

---

## 1. 改动文件（26 个：25 修改 + 1 白名单缩减）

| # | 文件 | 内容 |
| --- | --- | --- |
| 1 | `typescript/tokens/types/member-boundary.xl.md` | 新增 `MemberHeadKind` / `MemberHeadPlan` / `MemberHeadScan.Plan` / `NextSignificant`（同行前瞻，跨行一律 `null`）；`ModifierCount` 保留为属性兼容入口 |
| 2 | `typescript/tokens/types/member-shell-catalog.xl.md` | `Create` 按 `Plan` 选外壳类；`Entry.Kind` / `BodyBracket` / `BodyBlock`；`NewShell` / `IsHeadParameterBracket` / `InstallParameterList` / `OpenMemberBody` / `OnBracketCreated` / `OpenNextHead`；`HeadKindAt` 增 `new` / `constructor` / 访问器关键字；`HeadCompute` 增参数表收口与体收口；`FinalizeShell` 增体收口 + 边界处预建下一成员壳；`Finalize` / `Unwrap` 把 `Parent` 指回宿主（孤儿壳不再吞字符） |
| 3 | `typescript/tokens/types/class-member-possible-util.xl.md` | `EarlyKind`；`HeadKindOf` / `EarlyHeadKind`；`Analyze` 在第一格把 `Kinds` 钉成单一 kind |
| 4 | `typescript/tokens/types/property-signature-possible-shape.xl.md` | 同上（interface 映射：`constructor`→`Method`、`new (`→`Construct`） |
| 5–15 | 11 个 `*PossibleShape`（method / constructor / class-get / class-set / class-index / class-static-block / method-signature / construct-signature / index-signature / get-accessor / set-accessor） | `BuildByIndex` 增 `state.Early` ⇒ `MemberShellCatalog.Create(...)` 分支 |
| 16–23 | 8 个成员形状（`MethodDeclarationShape` / `ConstructorShape` / `GetAccessorShape` / `SetAccessorShape` / `IndexSignatureShape` / `ClassStaticBlockDeclarationShape` / `MethodSignatureShape` / `ConstructSignatureShape`） | 增 `ExitOrPre`（`HandOffOnBodyClose`）/ `ComputePossibleShapes`（`HeadCompute`）/ `OnBracketCreatedEvent`（`OnBracketCreated`） |
| 24 | `typescript/tokens/declarations/class-declaration-shape.xl.md` | `BuildParameters` 先收 B1 建好的 `ParameterShape`，有残留才回退逐字解析 |
| 25 | `typescript/tokens/types/type-builder.xl.md` | `ParseParameterList` 同上（interface 侧） |
| 26 | `tests/parse/external-dts-known-gap.txt` | **缩减 3 行**（`@types/node/test.d.ts`、`lib.es2021.intl.d.ts`、`typescript.d.ts`）：这三件现在**不再需要** `EnableFileFallback`，AST 仍 DIFF=0；清单「只许减」，不删则 gates 红 |

---

## 2. 验收读数（同一 bundle；step = 源码 0 基）

### 2.1 `tmp/class-members.ts`（`class C { m(a: number) { return a; } constructor() {} get x() { return 1; } [k: string]: any }`，95 step）

| shape | 首见 step | char | 说明 |
| --- | ---: | --- | --- |
| `MethodDeclarationShape` | **11** | `(` | 成员第一格 `m` 闭合格 |
| `IdentifierShape`（`m`） | **11** | `(` | ✓ |
| `ParameterShape` | **13** | `:` | 参数表 `(` 目录 |
| `IdentifierShape`（`a`） | **13** | `:` | ✓ 参数名闭合格 |
| `BlockShape`（方法体） | **23** | `{` | ✓ 体 `{` 格 |
| `ReturnStatementShape` | **34** | ` ` | `return` 在体内按格建（`return` 不是 AST 子节点，落到语句壳） |
| `ConstructorShape` | **48** | `(` | ✓ |
| `ConstructorKeywordShape` | **48** | `(` | ✓ `constructor` 闭合格 |
| `GetAccessorShape` | **57** | ` ` | `get` 闭合格 |
| `GetKeywordShape` | **57** | ` ` | ✓ |
| `IdentifierShape`（`x`） | **59** | `(` | ✓ 名字闭合格 |
| `IndexSignatureShape` | **86** | `]` | ✓ `[` 的闭合格（`readonly` 前缀不在本轮范围） |

计数器：`created 4 / finalized 4 / unwrapped 0 / pruned 0`（四个成员各一条，零拆壳）。
`ts`：ok（structural / moved / fields 全空）。

### 2.2 `tmp/interface-members.ts`（`interface I { m(a: number): void; new (x: number): I; [k: string]: any }`，73 step）

| shape | 首见 step | char |
| --- | ---: | --- |
| `MethodSignatureShape` | **15** | `(` |
| `IdentifierShape`（`m`） | **15** | `(` |
| `ParameterShape` | **17** | `:` |
| `IdentifierShape`（`a`） | **17** | `:` |
| `ConstructSignatureShape` | **37** | ` ` |
| `NewKeywordShape` | **37** | ` ` |
| `IndexSignatureShape` | **64** | `]` |

计数器：`created 3 / finalized 3 / unwrapped 0 / pruned 0`。`ts`：ok。

### 2.3 全量回归

| 套件 | 基线 | 本分支 |
| --- | --- | --- |
| `tshape-judge ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（`class-ball` / `expression-zoo` / `generic-container` 逐条一致） |
| `tts run.mjs` | exit 0（throw 3 / incremental 426） | **exit 0** |
| `tts-impl run.mjs` | exit 0 | **exit 0** |
| `xl_build`（core+typescript→ts） | 0 error | **0 error**（3 条既有 E1107 warning） |
| `tsc -p .` | exit 0 | **exit 0** |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 PASS / 0 FAIL / 7 N/A**，exit 0 |
| `wide-ast`（incremental 默认） | 5 崩溃 / 32 差异 / 94 fallback | **0 崩溃 / 32 差异 / 90 fallback**；缺 range 0、越界 0；崩溃与 fallback 均下降，差异持平 |

---

## 3. 过程中修掉的三个结构性问题（都在本 WP 内）

1. **孤儿外壳吞字符**：`Finalize` / `Unwrap` 原来把 `shell.Parent = null`，`UnitToken.Process` 的
   「Parent.MountedUnit 已经不是自己」守卫因此失效；128 字符窗口里壳被丢掉后还会继续吃后面的
   `}`（`class Trap { static /* { */ { } }` 崩溃）。改为 `Parent = host`。
2. **相邻成员壳漏进 AST**：无分隔符相邻成员（`f(x:number): void` ⏎ `f/* c */(...)`）里，下一成员
   第一格被上一条壳吞过、闭合格已过去；重放 `(` 时宿主 `MountedUnit` 为空，括号被收成兄弟，
   壳以 `End = 0` 留在 AST（`mut-type-overload-interface-126`、`webidl.d.ts` 崩溃）。
   边界收口成功后 `OpenNextHead` 当场建下一成员的壳；`Unwrap` 时不建（避免「已建 + raw」混排）。
3. **返回类型 / 默认值里的 `(` 被当参数表**：`x is (string)` / `m(a = f(b))` 也会触发
   `OnBracketCreated`。`IsHeadParameterBracket` 只认外壳里第一个 `(` 且前一个非 trivia 是名字 /
   泛型关闭符 / `?`。
4. **参数表的区间口径差**：B1 把参数子树的 `SourceRange.Start` 签在 token 起点，legacy / TS 的
   `pos` 含前导 trivia；多参数 / rest / 换行 / 两端空白的参数表会在 `wide-ast` 里多出 moved。
   `InstallParameterList` 因此只接**紧凑的单参数表**（`m(a: number)`），其余整段交 legacy；
   `wide-ast` 差异数因此保持基线 32（`@types/node/http.d.ts` / `https.d.ts` 回到基线口径）。

---

## 4. 未完成项（按 method / constructor / accessor / index 分类）

1. **method**：`@` 装饰器、`*generator`、计算名 `[expr]()`、修饰词链跨行一律 `Plan = null`，走旧路径。
   泛型方法 `<...>` 已接（配平后必须紧跟 `(`）。
2. **constructor**：参数属性（`constructor(private a: A)`）不是 B1 的「简单参数表」⇒ 参数逐字目录
   不挂（整段 legacy），但构造器壳本身已在第一格建出。interface 的 `constructor` 按方法名处理。
3. **accessor**：`get` / `set` 仅在「后面确实跟名字」时算关键字；`get()` / `get: A` 仍按方法 / 属性。
   计算名访问器 `get [x]()` 未接。
4. **index**：只接「第一格是已闭合 `[`、内容是 `name :`」；`readonly [k: string]`（前导修饰词）
   与计算名 `[expr]` 未接。索引签名**内部**的类型 token（`string` / `any`）仍等到 `}`（类型目录不在本 WP）。
5. **interface 的 `,` 分隔成员**：一条外壳可能跨两个成员，`BuildMember`（恰好一条）会 `Unwrap`
   回 legacy —— AST 正确，但没有早建（`webidl.d.ts` 即此类；已确保不混排、不崩）。
6. **静态块**：`static {` 已提前建壳；`static /* { */ {` 的注释 trivia 走同一路径（已验证）。
7. `tmp/` 下的探针（`probe*.cjs`、`class-members.ts`、`interface-members.ts` 等）是诊断用，
   `tmp/` 已 gitignore，未提交。

---

## 5. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b2c-member-kinds"
Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .

node typescript/cases/tts/tools/tshape-judge.mjs trace tmp/class-members.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace tmp/interface-members.ts

node typescript/cases/tts/tools/tshape-judge.mjs ts-all --out tmp/ts-all-b2c.json   # 429 / 426 / 3
node typescript/cases/tts/run.mjs --quiet                                          # exit 0
node typescript/cases/tts-impl/run.mjs --quiet                                     # exit 0
node tests/gates/run.mjs                                                           # 4 PASS / 0 FAIL / 7 N/A
node tests/parse/wide-ast.mjs                                                      # 0 / 32 / 90，缺 range 0、越界 0
```
