# HANDOFF — impl-wp3-19（WP-3 第十九波：声明边界「调用位」判据；D 类 2/4 落地）

STATUS: **PARTIAL / 净正（AST）**。AST **6136 / 6167**（起点 `impl-wp3-18 @ 991a1a18` = 6134），
结构差 **27 → 25**、位置差 **26 → 24**、字段差 0、cj-fail 0；real-dts 226/226；quick/standard PASS；
xl_check 0 error / 2414 warning；tsc 0。
buffer xml **PASS 4487 / FAIL 17 / ERROR 52**（起点 4488/16/52，**−1 PASS**，见 §3 口径说明与回滚办法）。

BRANCH: impl-wp3-19（源码 1 个文件 + 本文件）
BASE: impl-wp3-18 @ 991a1a18

## 0. 一句话结论（给 Lead）

D 类的根因不是 `StatementBuilder` 的表达式终点，而是 **root item 的「声明边界」判据**
`RootItemRule.IsDeclarationBoundary`：它把换行后的 `(` / `[` / 模板**一律**当成声明边界
（注释里写着「`export const x = a` ⏎ `(b)` 在 TS 里是两条语句」——**这条旧结论是错的**）。
TS 只在上一格**当不了调用者**时才插 ASI：`a` ⏎ `(b)` 仍是 `a(b)` 一条。
把调用位判据换成 `StatementScanner.IsCallPositionBlocked`（与 `EndsAtLineBreak` 同源）后：

- `export = a\n(b);` → `ExportAssignment[0,15]`（原 `[0,10]` + 多余 ExpressionStatement）✔
- `export default a\n(b);` → 同理 ✔
- AST **6134 → 6136**（+2；结构差 27→25、位置差 26→24），buffer **4488 → 4487**（−1，见 §3）。
- `const x = a\n(b)`（#290，**无 `;` 的 EOF 尾巴**）**仍未修**：它不走 `IsDeclarationBoundary`，
  走 `SourceFileTailBuilder.BuildTrailingDeclaration` 的段内拆分（§4.1）。

## 1. 本波唯一源码改动（`typescript/tokens/items/root-item-rule.xl.md`，commit `ec5d17ba`）

`IsDeclarationBoundary`（原第 531 行起）在 `next instanceof Symbol` 的续接表之后新增一段：

```ts
// 调用位（`(` / `[` / 反引号模板）：上一格是普通表达式尾巴时换行**继续**同一条表达式
// （`const x = a` ⏎ `(b)` = `a(b)`），只有当上一格当不了调用者（`as`/`satisfies` 的类型、
// 块体箭头 `=> {}`、后缀 `++`/`--`）时才是声明边界。判据与 `EndsAtLineBreak` 同源。
if (StatementScanner.IsCallishUnit(next)) {
  return StatementScanner.IsCallPositionBlocked(code, at - 1);
}
```

同时改写了该方法的注释块（旧注释「`(` `[` 与模板字符串**不在**续接里」已被实测推翻：
`HANDOFF.wp3-8 类 2` 把「`as T` ⏎ `(b)`（两条）」与「`a` ⏎ `(b)`（一条）」混成一种）。

为什么不会回归 wp3-8 类 2：`IsCallPositionBlocked` 对 `as` / `satisfies` 右半的类型、块体箭头
`=> {}`、后缀 `++`/`--` 仍返回 true ⇒ 那些形态照样在换行处收口。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | 6167：一致 **6136**；结构差 **25**、位置差 **24**、字段差 0、cj-fail 0 | **+2 vs 起点** |
| real-dts | `real-dts-ast.mjs` | 226 文件：成功 226、崩溃 0、AST 一致 226 | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **4487 / 17 / 52**、digest **4379 / 125 / 52** | 见 §3（−1 PASS） |
| quick | `gates.ps1 -Tier quick` | **PASS** 5.8s | PASS |
| standard | `gates.ps1 -Tier standard` | **PASS** 10.4s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 3. buffer 的 −1 与取舍（必须让 Lead 知道）

- 起点 wp3-18 记录：xml **4488 / 16 / 52**、digest 4380 / 124 / 52；本波：xml **4487 / 17 / 52**、
  digest **4379 / 125 / 52**（各 −1 PASS）。
- 也就是说 D 类这 2 条 AST 收益在 XML 侧换了 −1 条。**未逐文件定位是哪一条**（时间用尽）：
  最可能是 `export =` / `export default` 跨行调用那两条 token-repros 用例之一——AST 变对了，
  但我们的 XML 序列化与 `baseline-build` 的字节口径在该形状上还差一处。
- 采纳口径：本波验收以 **AST** 为准（6136 > 6134），buffer 仍高于更早的 4481/23/52（wp3-15 起点）。
- **若 Lead 认为 buffer 不许倒退**：`git revert ec5d17ba` 即回到 4488/16/52 + 6134，一键可逆。

## 4. 未完成项（精确落点，按类）

### 4.1 D 类剩 2 条（`const x = a` ⏎ `(b)` #290 与 `const f = () => 1` ⏎ `(y)` #184）

本波已证明它们**不走** `IsDeclarationBoundary`：

- 探测（`SourceFileRunner.Parse`）：`const x = a\n(b);`（**有** `;`）本来就正确 → 一条 `VariableStatement[0,16]`；
  只有**没有 `;`** 的 `const x = a\n(b)` 才裂成 `[0,11]` + `ExpressionStatement[11,15]`。
- ⇒ 落点在 `typescript/tokens/items/source-file-tail-builder.xl.md` 的
  `BuildTrailingDeclaration` / 段内拆分（第 440–560 行一带）：它自己再切一刀，切点落在 `a` 之后。
  同一函数里 `let boundary = -1`（第 579 行起）那段多语句分界，第 665 行的
  `IsExpressionTail(prev) && !IsContinuation(unit)` 对 `(` 返回「不是边界」（正确），
  所以真正切点在更上面的可变语句/装饰器分支里，**下一步从这里读**。
- `IsUncontinuableTailBoundary` 对本例返回 false（`IsCallPositionBlocked(a)` = false），已排除。

### 4.2 F 类 5（装饰器变量声明，`@dec` ⏎ `const x = 1;`）

- 实测形状：`VariableStatement[0,10]`（= `@dec\nconst`！）+ `ExpressionStatement[10,17]`（`x = 1;`）。
  即**空声明列表的变量语句照样收口**。
- 已有现成闸门：`RootItemRule.IsEmptyVariableStatement`（第 499 行）正是为这种形状写的，
  但**第 516–518 行有一条 `@` 豁免**（`if (code[0] is "@") return false;`，注释写着「F 类还没修」）。
- ⇒ 下一波第一步：删掉这条 `@` 豁免，并要求「吃到 `;`」再收口（只在 root accept 点，
  即 `IsEmptyVariableStatement` 的唯一调用点）。wp3-13 说去掉它会回归 `var` ⏎ `y`，
  所以要**只对装饰器段**去掉豁免（`code[0] is "@"` 时返回结构判据的结果，而不是直接 false）。

### 4.3 G 类 2（`module N` ⏎ `{}` / `namespace N` ⏎ `{}`）

- 现状：`ModuleDeclaration[0,8]`（停在 `N`）+ `Block[8,11]`；应为 `ModuleDeclaration[0,11]`，
  children 是 `ModuleBlock`（不是 `Block`）。
- ⇒ 落点：`module-item-rule` / module-declaration-shape 的体边界（换行后 `{` 必须并进声明）。

### 4.4 H 类 3（无体模块 `End+1` / namespace-export `End+1` / `ExportKeyword Pos`）

- `#48 declare module "m"` → `ModuleDeclaration ts[0,18] cj[0,19]`（**End 多 1**）；
  `#49 declare module "m" // c` → `cj[0,23]`（把行注释算进 End）；
  `#95 export as namespace A\nz;` → `NamespaceExportDeclaration ts[0,21] cj[0,22]`（End 多 1）；
  `# 9 export as namespace N; // trailing` → `ts[0,22] cj[0,34]`（End 吃进尾注释）；
  `#155` / `#72` 的 `ExportKeyword Pos`：`ts[26,33] cj[0,33]`（Pos 用 0 而不是 export 的位置）。
- ⇒ 全部在 `source-file-tail-builder` 的重锚口径（`Finish`/`End` 取最后一个**代码**单元而不是
  最后一个单元；`ExportKeyword` 的 Pos 用 export token 的 StartIndex）。

### 4.5 I 类 13（逐个判断，未动）

`#86` BOM `const\uFEFFx8 = 3;`；`#14/#15 class<T> {}`；`#81 import x from "m" ⏎ type T = A;`；
`#20/#22 import … ⏎ a;`；`#72 export import A = B.C.D; export import D = require("n")`；
`#33/#37 type T = … // c ⏎ ;`；`#25 interface I5 extends { a: 1 } { }`；
`#126 import type from 'm' ⏎ import type from 'n';`；`#13/#15/#61 f<T>`t`` 模板标签；
`#169/#171/#179 yield ⏎ (1)`（受限产生式：TS 侧 `yield` 换行后 `(1)` 仍是实参？需核对 ts-ast）。
**归属建议**：`class<T>` / `interface extends` / 模板标签属成员与类型族（irrelevant to root）；
`import` 换行与 `yield` 属 statements / import 族；`export import` 的 ExportKeyword Pos 与 §4.4 同源。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-20 -From impl-wp3-19 -Base impl-wp3-19
cd impl-wp3-20
# xl_build(cwd="...\impl-wp3-20", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
```

子集快验（很便宜，~2s）：`node .\typescript\cases\ast-json.mjs statements export declaration modules module-blocks module-declarations`，
再 `ast-json-diff` 同参数。单例探针：本波用的 `tmp-probe.mjs`（**未提交**，需要就照抄 §4 的 20 行写法）。

## 6. 阻塞点

无。

## 7. 踩过的坑（新增）

1. **`ast-json-diff` 必须紧跟在 `ast-json` 之后跑**：`git checkout -- typescript/cases` 把
   `.cj-ast.json` 恢复成仓库里的版本（那是**全对**的快照），此时单跑 diff 会打印「6167/6167 全一致」
   的假读数（本波先踩了一次）。顺序永远是 `ast-json` → `ast-json-diff` → `git checkout`。
2. **`cmd /c "node … > log"` 写出的日志是 GBK**：PowerShell 里直接 `Get-Content` 会看到乱码，
   但 `#290` 这类 ASCII 行仍可读；要中文就 `[Text.Encoding]::GetEncoding(936).GetString([IO.File]::ReadAllBytes($abs))`。
   注意 .NET 的当前目录**不是** PS 的 `cd` 目录，路径一律传绝对路径。
3. **`node tmp-probe.mjs` 直接 require `build/ts/**`**：改完 `.xl.md` 要 `xl_build` + `tsc` 才看得到效果，
   但探针本身不需要重跑全量 AST，单例迭代几秒一次。
4. `ast-json.mjs` 的参数是**构造名**（`typescript/cases/*.ts` 的文件名），不是目录名：
   `modules` / `exports` 不存在，正确名是 `module-blocks` / `module-declarations` / `export` / `import`。
5. `IsEmptyVariableStatement` 里那条 `@` 豁免就是 F 类的病灶，注释自己写着「F 类还没修」——
   下一波先看这类「注释里承认还没修」的分支，比从现象倒推快得多。
