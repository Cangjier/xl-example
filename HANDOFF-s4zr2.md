# HANDOFF — Stage 4z-r2：单调让位 + 晚建格 Accept + 起点同步（已落地，开关仍为 false）

分支 `feature/possible-statement-s4zr2`，基线 `feature/possible-statement` @ **fa6ecbc1**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4zr2`。

## 1. 结论先行（不伪造绿）

- **HANDOFF-s4z §5 的第 1、2 步已落地并验证**：三处源码改动都在，`xl_build` 892/0、`tsc` exit 0，
  默认态（`EnableDeclarationShell=false`）**全表绿**（§4）。
- **打开态仍未全绿**：27 条专用用例 **25 通过 / 2 失败**（基线 S4r 是 25/2，但**失败的是不同的两条症状**），
  `harness --all` **100/1/known1**（唯一失败仍是 `asi/asi-type-then-return`）。
  所以 `EnableDeclarationShell` **保持 false 进源码**，未提交任何「打开态可用」的声明。
- 第 3、4 步（token-ast 4 条、real-dts 1 条）**未开始**：`defer` 修饰符与 3 条 expr-generic 属打开态
  才暴露的问题，打开态本身还没收干净，先去修它们没有意义（S4z §5 的顺序也是这么排的）。

## 2. 三处改动（已提交）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-route-util.xl.md` | `ShouldYieldToDeclarationShell` 删掉 `CanEndStatementAt` 分支与 `ItemStart` / `headAt` / trivia 三段预判，正文收到一行：`EnableDeclarationShell && EnableShellExpressions && Decide(...) === ShellDeclarationFamily`（**单调**）；同时移除已无用的 `StatementBoundaryUtil` import |
| `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | `ComputeByIndex` / `IsBuildable` 的晚建格不再 `CanEndStatementAt → Reject`，**一律 Accept / 可建**；`StatementBoundaryUtil` import 随之移除 |
| `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md` | `BuildByIndex` 的 `const start` → `let start`；在 `route` 求值**之后**、`pos` 计算**之前**插入起点同步：`route === ShellDeclarationFamily && tokenIndex > start && StatementBoundaryUtil.CanEndStatementAt(host.Data, tokenIndex)` 时 `start = tokenIndex`；`# dependencies` 补 `StatementBoundaryUtil`（S4z §3 的坑：漏这行 `xl_build` 仍 0 error，只有 `tsc` 报 TS2304） |

这三处都是**只有开关打开才生效**的路径：`EnableDeclarationShell=false` 时
`DecideDeclaration` 直接返回 `None`，`route` 永远不等于 `ShellDeclarationFamily`，
门控 / 晚建 / 起点同步全部短路。默认态因此逐位不变（§4 的 6167 / 226 / 1716 读数即证据）。

## 3. 打开态读数（运行期 patch `build/ts/.../statement-route-util.js` 后测，测完已还原）

| 仪器 | 读数 | 基线（S4z 之前的 S4r/S4z 记录） |
|---|---|---|
| `declaration-statement-takeover` | `cases=27 failed=2 takeover=21 totalShell=25` | 25/2（失败组合 2 条） |
| `harness --double-accept` | `cases=120 failed=0`、**冲突 0** | 冲突 1（S4r：double-accept failed=1） |
| `harness --all` | `pass=100 fail=1 known=1`，`file-fallback total=0` | 打开态未测过全表 |
| `--all` 唯一失败 | `asi/asi-type-then-return`：`#0 kind TS=TypeAliasDeclaration CJ=Common` | 同一条（S4r 已记录） |

**逐条**：`type T = 1;` / `type T = { a: 1 };` / `namespace N { }` / `module M { }` /
`declare const x: number;` / `declare function f(): void;` / `import x from "y";` /
`import {a} from "m";` / `import "m";` / `export const a=1;` / `export default 1;` /
`export { a };` / `export * from "m";` / `using x = y;` —— 全部 `decl=1`、XML==legacy、AST==TS；
`import x from "y";\nexport { x };` `decl=2` 通过。**起点同步有效**：`interface I { }` 之后的
`const` 不再被吞进 interface 节点（旧的 `CJ=[0,28)` 吞并已消失）。

**仍失败的 2 条**（用临时脚本 dump，脚本已删）：

```
"interface I { }\nconst a = 1;"            decl=2（期望 1）  CJ nodes 9 / TS 7
  #0 TS=InterfaceDeclaration[0,15)  CJ=Common[0,9)
  XML=<SourceFileShape><Common>interface</Common><Common>I</Common><Bracket .../><Common>const</Common>...
"type T = 1;\nenum E { A }\nexport { T, E };"  decl=3
  #0 TypeAliasDeclaration 正确（[0,11) 逐节点一致）
  #4 TS=EnumDeclaration[11,24)  CJ=Common[12,16) —— enum 起全部 raw
"type T = A\nreturn;"                      decl=2  全 raw（CJ #0 Common[0,4)）
```

**读法**：XML 里这些语句是**整段 raw**（`<Common>interface</Common><Common>I</Common>…`），
不是「建错了树」——说明壳被建出来又被 `DetachShell` 回退。两条失败都发生在
**「上一条声明还没收口，下一条语句就来了」**的形态上（`}` ⏎ `const`、`;` ⏎ `enum`、`A` ⏎ `return`）。

**根因假设（未证实，下一轮从这里入手）**：单调让位后，上一条声明壳开着时，下一条语句首格的
`route` 仍命中 `ShellDeclarationFamily`（`ItemStart` / 缓存还指向上一条），
`DeclarationStatementPossibleShape` 在晚建格一律 Accept 又建出**第二个**声明壳（所以 `decl=2/3` 而不是 1）；
两个壳交错收口，`BuildFromShell` 失败 → `DetachShell` 回退成 raw。
下一步该验的判据是「当前条目已经是声明壳且尚未收口时，晚建格不许再 Accept」——
即先让壳的终结候选收口，再让下一条语句的起点候选判定；可查
`host.MountedUnit instanceof StatementShape && MountedUnit.Kind === ShellDeclarationFamily`。
（本轮 9 轮预算已到，没有再改逻辑；不敢带一个未验证的判据进源码。）

## 4. 默认态全表读数（本轮实测，开关 false）

| 仪器 | 读数 |
|---|---|
| `xl_build`（core+typescript, ts） | **892 written / 0 error**（2526 warning，全是既有的 W3102/W3103 无描述） |
| `tsc -p tsconfig.json` | **exit 0** |
| `harness --all` | **pass=101 fail=0 skip=0 known=1**，`file-fallback total=0`，冲突 0 |
| `harness --double-accept` | **cases=120 failed=0**，冲突 0 |
| `harness --lint` | **PASS**（ASI 唯一 / 优先级数字表只在 operator-table） |
| `typescript/cases/ast-json.mjs` | **6167/6167**（47 个构造） |
| `typescript/cases/ast-json.mjs` 后 `git status --short typescript/cases` | **空**（等价） |
| `ast-json-diff` | **6167 条完全一致 / 6167**，结构差 0、位置差 0、字段差 0 |
| `typescript/cases/token-ast.mjs` | **total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0** |
| `typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 |
| `tests/parse/validate.mjs` | **1720 条 / 0 不合格** |
| `control-flow-takeover` | cases=39 failed=0 |
| `control-flow-body-takeover` | cases=46 failed=0（brace=34 body=60） |
| `block-body-takeover` | cases=21 failed=0 |
| `s4j-function-body` / `s4l-await-body` | 全 PASS |
| `stage4aa` / `stage4y` / `stage4w` | 12 / 20 / 15，fail=0 |
| `r1-asi` | 31，fail=0 |
| `stage4b` / `stage4c` / `stage4c2` | 17 / 42 / 33，fail=0 |
| `dev` / `operators-live` | 22 / 40，fail=0 |
| `op-ast-proof` / `op-proof` | 90/90 / 40/40 |
| `comma-import-fallback` | 11/11 |
| `declaration-statement-takeover`（**开关 false 时**） | `cases=27 failed=22 defaultFlags=false takeover=0` —— 这条仪器**自检开关为 true**，所以它不是一个「默认态门」：开关 false 时它必然红（基线同样如此） |

未跑：`tests/statement-possible/perf.mjs`、`tests/feas-operator/harness.mjs`、
`tests/feas-operator/insert-between.test.mjs`（预算到点；这三条与本次改动无接口，本轮改动默认态短路）。

## 5. 开关与分支状态

- `StatementRouteUtil.EnableDeclarationShell` = **false**（未改，默认态安全）。
- 分支上 3 个 commit（源码 1 + 文档 2），未 push、未 merge、未动主仓库。
- `StatementBoundaryUtil.IsAsiBoundary` 函数体未改。

## 6. 未覆盖清单（与 S4z 一致，本轮未推进）

- 无逐条专用断言的语法形态：`abstract class`、`declare global`、`declare module "m"`、
  `using`（只有组合用例里间接出现）、`export =`、`import x = require()`。
  （其中 `abstract class A {}` / `using x = y;` / `module.exports = 1;` / `import("m");` 在当前
  `declaration-statement-cases.json` 里是**负例**（期望 decl=0），不是逐条断言。）
- `tests/statement-possible/declaration-statement-cases.json` 的 `--group=stage4q` 到 harness
  groups 的映射**仍未接**（第 6 项任务未做）。

## 7. 风险

| id | 风险 | 现状 |
|---|---|---|
| R1 | 单调让位只在开关打开时生效，**打开态仍不合格** | 2 条组合 + 1 条 ASI，§3 有逐条证据与下一步判据 |
| R2 | 打开态的失败形态是「壳建了又被回退成 raw」，不是「建错树」 | 比 S4r 的 `decl=2` + 吞并更接近正确，但根因未证实（§3 假设） |
| R3 | `pwsh` 用 `Get-Content -Raw` + `[IO.File]::WriteAllText` 回写 `build/ts/*.js` 会把多行注释**合并**、破坏 UTF-8，`node --check` 报 `Unexpected token '.'` | 本轮踩到并定位；**改 `.xl.md` 用 edit/write 工具，改 `build/ts` 用 `node -e fs.readFileSync/writeFileSync`** |
| R4 | `xl_build` 0 error ≠ 可编译 | 本轮照 S4z §3 每次都 `xl_build` + `tsc` 双过再跑测试，无假读数 |
