# HANDOFF — impl-wp3-29（WP-3 第二十九波：yield + class<T> 落地，AST 6156→6161）

STATUS: **PARTIAL / 净正（AST +5）**。**6156 → 6161 / 6167**（结构差 11→**6**、位置差 5、字段差 0、cj-fail 0）。
本波修复 **#14/#15（class<T>）** 与 **#169/#171/#179（yield）** 共 5 条；**#81、#13/#15/#61、#25** 未修（定位已推进，见 §3）。

BRANCH: impl-wp3-29 @ 85611882
BASE: impl-wp3-27 @ b445e9c8

## 1. 源码改动（3 个文件，2 个修复）

### 1.1 `typescript/tokens/items/root-item-rule.xl.md` — `KindOf`（#14/#15 的必要条件）

`head === "class"` 分支删掉「`class` 后紧跟 `<` ⇒ 返回 9（表达式语句）」的特判，一律 `return 3`：
TS 对 `class<T> {}` / `class<T> extends B {}` 建的是**无名字的 ClassDeclaration**（`<T>` 是它的
TypeParameters）。原注释对 TS 的判断是错的（impl-wp3-28 §2.1 已实测证实）。

### 1.2 `typescript/tokens/declarations/class-declaration-shape.xl.md` — `BuildFromCode`（#14/#15）

名字缺省时不再无条件 `throw`，新增 `anonymousHead`：
头是 `Bracket`（`class {}`）或 `` Symbol.Is("<") ``（`class<T>`）时同样接受无名头，
不再要求调用方传 `allowAnonymous`（那条只区分一次性路径与壳收口）。

### 1.3 `typescript/tokens/statements/statement-builder.xl.md` — `BuildExpressionStatement`（#169/#171/#179）

`yield` 受限产生式的 ASI 切断**加 generator 上下文守卫**：原先无条件在 `yield` 处收口，于是语句层的
`yield⏎(1);` / `yield⏎[1];` / `yield␍(1);` 在**脚本顶层**也被切成 `yield` 语句 + `(1)` 语句
（TS 顶层 `yield` 是普通标识符，`yield(1)` 是 CallExpression）。现在复用
`ExpressionBuilder.EnclosingFunctionFlags(first)`（词法、被函数边界重置；`1`/`3` = generator / async generator）
判定，只在 generator 上下文里保留 ASI 切断。**表达式 builder 一字未改**（`ParseYield` 本来就对）。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0，3.85s | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| ast-json | 全量 | 6167/6167、cj-fail 0（47 构造） | PASS |
| ast-json-diff | 全量（严格先 ast-json 再 diff） | **6161/6167**；结构 6 / 位置 5 / 字段 0 | **+5 vs wp3-27** |
| real-dts | `real-dts-ast.mjs` | 226：成功 226、崩溃 0、一致 226 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS** | PASS |
| standard | `..\gates.ps1 -Tier standard` | **PASS**（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |
| full | `..\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | 41.7s；**2 项必过门禁红**：buffer-equivalence、class-scaling --base | 见下 |
| buffer | 同上（base=baseline-build） | xml **PASS 4488 / FAIL 16 / ERROR 52**；digest **PASS 4384 / FAIL 120 / ERROR 52** | xml 与 wp3-27/w23 逐项相同；digest 比 wp3-23 的 4383/121 多 **+1 PASS**（未倒退） |
| class-scaling --base | 同上 | FAIL：①档 A 成员数倍数 2.66 > 2.6（标度噪声）；②`same-line` 错误不一致 `base=throw by line 0 / new=null` | ②是**早期错误恢复波次**留下的既存差异，不是本波引入 |

## 3. 未完成项（定位结论，供下一波）

### 3.1 #81 `import x from "m"` ⏎ `type T = A;`（+1）— 未修
实测 cj：`Common(18,22) type` + `Common(23,24) T` + `Symbol(25,26) =` + `ExpressionStatement[26,29] A;`
（整条 `type T =` 落 raw，`A;` 单独成语句）。`KindOf` 对 `type T = A` 应返回 8（probe 逻辑 `at+2` 命中 `=`），
但 item 在 `=` 后就收口，说明**断点不在 `KindOf` 的族判据**，而在 `StatementItemScan` / 声明候选的扫描或
`StatementBuilder` 侧对 `type` 开头的 item 的处理。下一波建议在 `statement-item-scan.Decide` 的 `type` 头分支打点。

### 3.2 #13/#15/#61 模板标签（+2/#15 位置 +1）— 未修，但**证伪了三个候选落点**
本波在 `root-item-rule` 里实现了三种「把模板 token 并进本条」的实验（单候选收口 C 路径、
`TryResolveHold` 的 `>` 收口、`Alive` 全灭的 ① 路径 + 两格后缀链），**全部零效果**（AST 仍 6161、逐条不变），
已 `git checkout` 回滚（本分支不含这些代码）。结论：`const t1 = f<T>`t`` 的 item 边界**不是 root itemizer
的三个收口路径定的**——模板 token 在 `root-item-rule.Analyze` 看到它之前就已经被下一条 item 拿走，
落点应改在 `statement-scanner.ScanToSemicolon` / `StatementBuilder.BuildVariableStatement` 的**终点扫描**
（`AngleJudge` 相关的 `>` 截断），或 `variable-declaration-list-shape` 的 End 计算。

### 3.3 #25 `interface I5 extends { a: 1 } { }`（+1）— 未修
实测 cj：`InterfaceDeclaration[0,29]`（body = **第一个** `{ a: 1 }` → 成员 PropertySignature/LiteralType），
`HeritageClause[12,20]` **无 children**，尾部 `{ }` 变成顶层 `Block[29,33]`。
即接口不是走壳的 `OnBracketCreatedEvent`/`IsDefinitelyBodyBracket`（那条规则会把 `extends` 后的 `{` 排除），
而是走**一次性 `FromUnits`**（`code.slice(index, code.length-1)` 假定最后一格是接口体）——item 边界停在 29
导致它把 heritage 的类型字面量当成 body。修法：让 `InterfaceDeclarationShape` 在一次性路径也从
heritage 列表里认出 `{`（或先修 item 边界）。

## 4. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-30 -From impl-wp3-29 -Base impl-wp3-29
cd impl-wp3-30
# xl_build(cwd="…\impl-wp3-30", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript/cases
```

## 5. 阻塞点

无工具阻塞。buffer/class-scaling 的两项红见 §2（buffer 在门禁口径里允许红，AST 才是硬门）。

## 6. 踩过的坑

1. **改完 `.xl.md` 必须先 `xl_build` 再 `tsc`**：本波第一次只跑了 tsc，diff 读数一模一样（6161→6161），
   白花一轮。`xl_build` 只传改动文件即可（增量，几秒）。
2. **`git checkout -- typescript/cases` 会把 `*.cj-ast.json` 还原成 committed 的「全绿」快照**（它们是 tracked）。
   要看真实 cj 树必须**在 checkout 之前**读（本波两次读到假绿后才反应过来）。
