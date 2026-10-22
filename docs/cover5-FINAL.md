# cover5 FINAL — 七类问题（§6）合并后的独立终验报告

- 主仓：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/quick-parse`，最终 HEAD **`65e56f0fd2e3975e4f915c445d43522bb10f474b`**
- 轮次起点：`5362a38bffd3a94d605b321a95ac32f3fd02e34c`；7 个类别分支已全部合入（7 个 merge commit，见 §7）
- Oracle：TypeScript **6.0.3**；硬性口径 **`parseDiagnostics.length === 0`** 且（本仓 crash 或 AST 结构/位置/字段任一不一致）才算真红
- 角色：**独立终验复核者**（不是合并者）。本报告只读主仓 + 只新增 `docs/cover5-FINAL.md`；
  未改任何代码 / 用例 / 其它文档。复核所用脚本放在本复核者的克隆 `tmp/`（未跟踪、未提交）。
- **结论：PASS**（证据见 §3、§8）

## 1. 最终读数表（基线 vs 最终，含每类增量）

| 门禁 | 基线 `5362a38` | 最终 `65e56f0f` | 判定 |
|---|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5335 / cj-ok 5335 / fail 0（47 构造） | **5709 / cj-ok 5709 / fail 0（47 构造）** | +374，全绿 |
| `node typescript/cases/ast-json-diff.mjs` | 5335/5335；结构 0 / 位置 0 / 字段 0 | **5709/5709；结构 0 / 位置 0 / 字段 0** | 全绿 |
| 七类标准 stem 合计（单 stem 跑） | 5335 内的对应段 | **1034 / 1034 完全一致；0/0/0** | 全绿 |
| `node typescript/cases/token-ast.mjs --quiet` | known-gap 0；non-known-gap 1704（ok 1694 / ts-invalid 10） | **同左**：known-gap 0；1704（ok 1694 / ts-invalid 10 / crash 0 / diff 0） | 无回归 |
| `node typescript/cases/real-dts-ast.mjs` | 226 文件 / 226 成功 / 226 一致 | **226 / 226 / 0 崩溃 / 226 完全一致** | 无回归 |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0**（无输出） | 无回归 |
| `xl_check`（core+typescript） | — | **0 error / 2464 warning**（既有 W3102/W3103 + 3 个既有 E2004 孤儿产物） | 可接受 |
| `git diff 5362a38..HEAD -- core typescript/IMPORTANCE.md` | — | **空**（core 零改动，IMPORTANCE 未动） | PASS |
| `git diff 5362a38..HEAD --stat` | — | **45 files changed, +46049 / −271** | 与账本一致 |

**每类增量账本（新增段实计数与 ast-json 单 stem 完全一致）**

| 类别 | stem 用例数 基线 → 最终 | 增量 | 单 stem 读数（ast-json / diff） |
|---|---|---|---|
| 1 basic-token | 91 → **108** | +17 | 108 cj-ok / 108 | 108 完全一致 0/0/0 |
| 2 missing-possible | 35 → **91** | +56 | 91 / 91 | 91 完全一致 0/0/0 |
| 3 missing-end | 68 → **115** | +47 | 115 / 115 | 115 完全一致 0/0/0 |
| 4 possible-compute | 68 → **129** | +61 | 129 / 129 | 129 完全一致 0/0/0 |
| 5 possible-build | 112 → **155** | +43 | 155 / 155 | 155 完全一致 0/0/0 |
| 6 end-compute | 166 → **262** | +96 | 262 / 262 | 262 完全一致 0/0/0 |
| 7 end-build | 120 → **174** | +54 | 174 / 174 | 174 完全一致 0/0/0 |
| **合计** | — | **+374** | **1034 / 1034** | **1034 完全一致 0/0/0** |

注：新增用例数 ≥ 该轮「真红→转绿」数，因为 IMPORTANCE §5 要求每组**先给 base**（base 允许基线即绿），
再给 trivia / 重复形变体；下面 §2 的「真红→转绿」列是该类别作者用回滚（`git stash`/回滚修复重建）实测的原始红数。

## 2. 七类问题清单表

| # | 类别 | 发现的问题族（摘要） | 真红→转绿 | 新增用例 | 修复文件 | 根因 file:line（摘要） | 四问要点 |
|---|---|---|---|---|---|---|---|
| 1 | basic token 存在问题 | ECMAScript 全空白集（NBSP、U+1680/2000–200B/202F/205F/3000、LS/PS）被 `Common` 吞进标识符/关键字/数字 | **13**（26 红 → 修后 13 红，其中 11 条只能改 core） | +17 | `typescript/run/typescript-symbol-template.xl.md`（`IsWhiteSpace` 覆写扩全集；**core 零改动**） | `core/syntax/templates/symbol-template.xl.md:222-238` 只认 4 种空白，`Common.IsAppend` 依赖它 → ts 层覆写收口 | 这些字符永不 build 成 shape，只由 `WrapSymbol` 认领为 trivia；close 只决定下一代码单元的 `Pos`，不进 AST |
| 2 | 缺少 possible | 块 / 体 / 被标体里的声明头没有分派（namespace/module/global、abstract class、const enum、declare 族、装饰器声明、export 声明族、default 声明形）；根级 `yield` 零候选 | **33**（31 + 2） | +56 | `statement-builder.xl.md:212`（BuildStatement 泛化 + BuildModuleDeclaration/ExportedStatement/DefaultModifierStatement/DecoratedStatement 等）、`module-block-shape.xl.md:136`、`enum-declaration-shape.xl.md:70`、`expression-statement-possible-shape.xl.md:115`、`statement-scanner.xl.md:237` | 块层「候选表」= BuildStatement 的分派表缺声明头；`@dec enum`/匿名 default class 的 FromUnits 口子缺失 | build 在块/体里声明头到齐时一次建完；export/default 摘下建完插回 Data 最前；close 即关（体是闭合括号单元）；关键字/装饰器区间与 Pos 用本层 Positions 重锚 |
| 3 | 缺少 end | 控制语句体、被标语句体、`debugger`、`return` 受限产生式、EOF 兜底声明族都缺「换行收口」通道 | **47**（A 19 / B 5 / C 3 / D 20） | +47 | `statement-scanner.xl.md:521 ScanExpressionBody`、`:454 ScanSimpleSemicolon`、`:429 ScanReturnOrThrow`；`source-file-end-possible-shape.xl.md:75/83`（HasLabelPrefix）+ `:483` + `:680/822/964/977` | 体扫描只认 `;`/EOF；`return` 的受限产生式只对 `throw` 生效；EOF 兜底只认段首字面声明词 | 体/受限产生式在「换行 + 上一格收得住 + 当前接不上」处 build；End 取体最后代码单元，边界单元留给下一条；被标语句让终结候选吐 Uncertain |
| 4 | possible compute 不对 | A `let`/`using`/`type` 双角色被一律当声明关键字；B 换行后调用位缺 ASI（`as`/箭头块体/模板）；C `import type` 的 `type` 双角色；D 语句体表达式缺换行 ASI | **61** | +61 | `statement-scanner.xl.md`（StartsBinding / StartsUsingDeclaration / IsCallPositionBlocked / ScanRoot·ScanBody 分流 / ScanExpressionBody）、`expression-statement-possible-shape.xl.md`（DualStage / CanStart / IsAsiBoundary / IsNonCallableExpressionTail）、`statement-builder.xl.md`、`source-file-end-possible-shape.xl.md`（isExportVariable）、`type-alias-declaration-possible-shape.xl.md`、`import-clause-possible-shape.xl.md`、`import-declaration-shape.xl.md` | 普通/终结候选状态机判据与 TS 解析不同源：该 Reject 时不 Reject（吞下一条→静默错树），该 Accept 时不 Accept（等 EOF→crash） | 能起绑定→声明在列表到齐时 build；不能→表达式在 `;`/ASI 边界 build；build 只切到边界前单元；cache 仍按形状具名状态逐格增量 |
| 5 | possible build 不对 | A 尖括号断言嵌套 `>>>`/`>>>>` 收口；B 枚举计算名；C import attribute 值表达式；D 参数装饰器后的解构/rest；E 参数属性 rest；F 对象字面量可选方法；G 可选调用 `?.<T>(` | **43**（A6/B7/C6/D7/E4/F8/G5） | +43 | `expression-builder.xl.md:2083 ParseAngleType` / `:2126 ParseAngleStart` / `:966`（`?.` 分支）/ `:1355 ParseObjectLiteral`；`enum-declaration-shape.xl.md:185 BuildMember`；`import-attribute-shape.xl.md:33 FromTokens`；`class-declaration-shape.xl.md:372 BuildParameters`；`function-declaration-shape.xl.md:422`；`type-builder.xl.md:1622 ParseDecorators` | 候选 Accept 与 build 时机都对，错在 `BuildByIndex→FromUnits` 提取：合符号最后一个 `>` 被多消费、`[k]` 名字抛错、attribute 非字符串值整段丢、装饰器截断/模式 Pos、rest 无人建、`?` 无人认领、`?.<` 无 build 支路 | build 时把用到的 basic token 数据全提进 shape 字段并丢弃；End 只取最后非 trivia 代码单元；区间口径不变；cache 未新增重扫（§3.4 未破） |
| 6 | end compute 不对 | 表达式尾非调用位（箭头块体/as/satisfies）；块体与根级判据不同源；`yield` 块级不收口；type alias 的 AsiEnd；export 延续词表把 `type` 当续接；类成员模板被当新成员名；变量/return 操作数端点 | **96** | +96 | `expression-statement-possible-shape.xl.md:316 IsAsiBoundary` / `:506 IsNonCallableExpressionTail` / `:651 IsUncontinuableTailBoundary` / `:708 IsPostfixOperatorAt`；`statement-builder.xl.md:551/718/1184`；`statement-scanner.xl.md:339`；`type-alias-declaration-possible-shape.xl.md:262`；`export-declaration-end-possible-shape.xl.md:95/:157`；`member-boundary.xl.md:98` | 终结格算错：早 Accept 切断表达式 / 晚 Accept 吞下一条语句；块级与根级各写一套判据 | build 在确定性边界（`;`/行末 ASI/EOF）前一个非 trivia 单元收口；End 只取最后非 trivia 单元；跨行一律按源位置判 |
| 7 | end build 不对 | EOF 兜底只认「段首字面就是声明词」：修饰词 class/function、export enum/import、export default 声明形、装饰器开头的 class | **54**（54/55 候选；1 条基线即绿已剔除） | +54 | `source-file-end-possible-shape.xl.md`（新增 `LeadingDeclarationKeyword:112` / `BodyDeclarationKeyword:137`；多声明边界 `:433-444`；装饰器 class `:500-515`；`export const enum` `:587-591`；export 声明族 `:627-663`；export default 声明形 `:698-772`；class/function 识别 `:876-878`/`:984`；export import `:955-981`） | Accept 时机正确（EOF 哨兵），错在 Accept 之后 BuildTrailingDeclaration 的识别口径 | EOF 上 build；整段按「修饰词 + 声明词」识别，End 取最后非 trivia 代码单元；close 时机不变；Data 只剩子节点形状 |

## 3. 独立验证证据（逐条实测，不只采信作者报告）

### 3.1 结构与基线（§必做 1）

```
$ git rev-parse HEAD
65e56f0fd2e3975e4f915c445d43522bb10f474b
$ git log --merges --oneline 5362a38..HEAD        # 7 条（详见 §7）
$ git diff 5362a38..HEAD --stat | tail -1
45 files changed, 46049 insertions(+), 271 deletions(-)
$ git diff 5362a38..HEAD -- core typescript/IMPORTANCE.md
（空）→ core/** 与 IMPORTANCE.md 零改动 PASS
$ git status --short
（空）
$ git ls-files | Select-String 'tmp/'
（空）→ tmp 探针未被提交 PASS
```

冲突标记检查：`git grep '^<<<<<<<'` 仅命中 2 处，均为**基线即有**的 `.txt` 围栏示例
（`typescript/tokens/trivia/conflict-marker-trivia-shape.xl.md:12`、
`typescript/tokens/aliases/last-trivia-token-shape.xl.md:13`，`git show 5362a38:…` 同样存在），
**不是合并残留**；仓库无真实未解决冲突。

### 3.2 七类标准文件与新增段（§必做 2）

7 个文件全部存在、非空，且每个文件均含 `cover5 round5` 新段落标记；新增段实计数
17/56/47/61/43/96/54 与 §1 账本逐项一致；单 stem `ast-json` + `ast-json-diff` 逐类全绿（见 §1 表）。

### 3.3 全量门禁（§必做 3）

见 §1：ast-json **5709/5709**、diff **5709/5709 0/0/0**、token-ast 不差于基线
（1704：ok 1694 / ts-invalid 10 / crash 0 / diff 0）、real-dts **226/226**、tsc **0**、
`xl_check` **0 error / 2464 warning**（既有 W3102/W3103 + 3 个既有 E2004 孤儿产物，均非本轮新增）。

### 3.4 独立抽样 21 条（§必做 4，防「假真红」）

方法：只读脚本（本复核者克隆 `tmp/final-sample.mjs`）从每个标准文件的新段落取**前 / 中 / 后**各 1 条
（共 21 条），直接用主仓 `node_modules/typescript` 6.0.3 `ts.createSourceFile(..., ScriptKind.TS)`
验 `parseDiagnostics.length`，再用主仓 `build/ts/typescript/run/source-file-runner.js` 解析，
经主仓 `typescript/cases/ast-compare.mjs` 的 `createAstCore/cjAst/flatten/groupByKind` 做
结构/位置/字段三栏比较。

**结果：21/21 PASS（tsDiag=0 且三栏 0/0/0）**

| 类别 | front | mid | back |
|---|---|---|---|
| basic-token | `const wsb0 = 1; const wsb1 = 2;` | `const wm = 1; const wn = 2;`（U+202F） | `const wz = 1; /* c */ const wz2 = 2;`（注释+NBSP） |
| missing-possible | `{ namespace N { let a = 1; } }` | `{ @dec type T = number; }` | `yield 1;` |
| missing-end | `while (a) b` ⏎ `c;` | `lbl: return` ⏎ `c;` | `export = a` ⏎ `export import x = A.B` |
| possible-compute | `let = 1;` | `const x = a as T & U` ⏎ `(b);` | `l: x` ⏎ `y();` |
| possible-build | `enum E5 { [k] }` | `class C2 { m(@a { x }: T) {} }` | `a?./*c*/<T>(b);` |
| end-compute | `const f0 = () => {};` | `function* g(){ yield` ⏎ `-x }` | `function f(){ return x + 1` ⏎ ` g() }` |
| end-build | `declare function f(): void` ⏎ `abstract class C {}` | `declare function f(): void` ⏎ `export enum E { A } // c` | `import x = require("m")` ⏎ `@dec class C {}` |

与 docs 对照（每类 `docs/cover5-<cat>.md` 是否把该族标为「基线红→修复后绿」）：
- basic-token：§2.1 全空白集 13 条转绿 + §5 用例清单（抽样 3 条在清单内）✅
- missing-possible：§2.1 块内 `namespace`/`@dec type`、§2.2 `yield 1;`（均为基线 crash）✅
- missing-end：§4.1 `while` 体、§4.2 `lbl: return`、§4.4 D 组 `export = a` ⏎ `export import x = A.B`（基线 crash）✅
- possible-compute：§A `let = 1;`、§B `as T|U` ⏎ `(c)`、§D `l: x` ⏎ `y();` ✅
- possible-build：A 枚举计算名、D 参数装饰器+解构、G `?.<T>(`（本复核者回滚实测：39 候选 30 crash + 8 diff）✅
- end-compute：§族 1 箭头块体 / 族 3 yield / 族 7 return 操作数端点 ✅（front 为 §5 base，允许基线绿）
- end-build：§4 行 1（修饰词 class）/ 行 3（export enum）/ 行 6（装饰器 class；带 `import x = require` 前缀）✅

### 3.5 同 stem 去重（§必做 5）

逐 stem 对「解码后的用例文本」做精确重复检查：**7 个标准文件内同 stem 重复 = 0**（PASS）。
跨 stem 精确重复 **1 条**：`declare async function f(): void`（`missing-end` 与 `end-build`），
按 lead 口径属可接受的信息项（两个类别都在 EOF 兜底建无体 async 函数，形态本身即共享）。

### 3.6 tmp 未提交 / 工作区干净（§必做 6）

`git ls-files | grep tmp/` 为空；`git status --short` 为空（本报告提交前）。PASS。

### 3.7 总分对照（§必做 7）

基线 5335 → 最终 **5709 = +374**；逐类增量 17/56/47/61/43/96/54 相加 = 374，与账本逐项一致。PASS。

## 4. 转交与遗留（下一批，按 docs file:line）

> 原则：合并后的分支只保证「本轮各类别声明的真红」全绿；以下是**本轮明细里明确转为下一批**的项，
> 不是回归，也不是本轮验收失败。

1. **装饰器尾随声明在「函数类声明前缀」之后（18 条，TS diag 全 0）**
   形态：`declare function gf(): void` ⏎ `@dec class C {}` 等（探针读数 ok=2 / crash=6 / diff=10）。
   - 首要半边 = **end compute**：`function-declaration-possible-shape.xl.md:186-212`（Stage 3）、
     `:213-273`（Stage 4）的 ASI Reject 只认 `IsStatementWord`，`@` 是 Symbol 不走 → 候选到 EOF 才收口。
     修法方向：边界判据认 `@` 为首的新声明起点，并与 `source-file-end-possible-shape` 已合入的
     `LeadingDeclarationKeyword` 同口径。
   - 次要半边 = **possible build**：`function-declaration-shape.xl.md:169`（`bodyIsLast`）、
     `:199-211`（返回类型 tailIndex 回退后未重判 body → 函数多一个 Block）。
   本复核者已在合并前交叉验证并报 lead；分支已冻结，未入本轮 case。
2. **U+2028 / U+2029 不是 ASI 断句点（end-compute）**
   `function f(){ return<U+2028>1; }` 等；basic-token 已把 LS/PS 归 trivia（已合入），
   但 ASI 判据点仍只认 `\n`/`\r`。待端到端收口到一个「ECMAScript LineTerminator」助手，列表见
   `docs/cover5-end-compute.md` §7.6、`docs/cover5-end-build.md` §8.2、`docs/cover5-basic-token.md` §3.2
   （`expression-statement-possible-shape` HasLineBreak/HasLineBreakBefore、
   `statement-builder` HasLineBreakAfter、`function-declaration-possible-shape`、
   `expression-builder` ParseYield/IsInsideGeneratorBody、`statement-scanner`、
   `member-boundary` HasLineBreakBetween、`typescript-template`）。
3. **块内 import / export 子句与 ExportAssignment（缺少 possible）**
   `{ import x from "m"; }` / `{ export { a }; }` / `{ export * from "m"; }`（7 条）与
   `{ export = foo; }` / `{ export default 1; }`（3 条）、匿名 `export default function () {}`（2 条）：
   `docs/cover5-missing-possible.md` §4 与 §6（需 Import/Export FromUnits 接线 + 修饰词投影、
   class 同款匿名口子）。
4. **模板块成员里的 `export { … }`（缺少 possible，modules 侧）**
   `docs/cover5-end-build.md` §8.5：`module-block-shape.xl.md:95-111` 的 BuildMember 分派未覆盖 `export {…}`。
5. **`@dec` 换行接 function / enum（缺少 possible，3 条）**
   `docs/cover5-missing-end.md` §7.2：装饰器通道只在 class 候选里，`function`/`enum` 前缀没有通道。
6. **possible-compute 遗留 5 条**（`docs/cover5-possible-compute.md` §5）：
   `let` ⏎ `let = 1`（end build）；块体/函数体内部同一条 ASI（possible build；`StatementBuilder.EndsAtLineBreak`
   未共享 `IsCallPositionBlocked`）；顶层 `yield`/`await` ⏎ `(1)`（上下文关键字）；export 家族调用位 ASI
   （possible compute，`IsStatementBoundaryAfterExpression` 无调用位判据）；`const x = a as T` ⏎ `<b>c`
   （possible build，`as` 类型后不回二元层）。
7. **end-compute 零散项**（`docs/cover5-end-compute.md` §7）：`type T = A` ⏎ `return`/`debugger`/`{a:1}`
   候选共存需协调；非 generator 上下文 `yield` ⏎ `(x)`（需块级知道 generator 体）；顶层 `return` ⏎ `x`；
   `await` ⏎ `x`（上下文关键字）；块级 type alias 的 `;` 后 trivia 复核；`IsStatementBoundaryAfterExpression`
   与窄判据的统一。
8. **`global {}` 作为尾随声明**（modules 侧，`docs/cover5-end-build.md` §8.4）；
   `export { a } from "m"` ⏎ `type T = A`（end-compute，§8.1：`export-declaration-end-possible-shape.xl.md:95/:157`
   的 `CanEndAt` 延续词表仍含 `type`）。
9. **missing-possible 待裁定 3 项**（§6）：块内 import/export 是否继续补；匿名 `export default function` 口子；
   「parse 合法即真值」口径确认。
10. **possible-build 待裁定/遗留**（`docs/cover5-possible-build.md` §6）：import attribute 非字符串恢复形
    是否降级；类装饰器顶层 `[` 截断是否覆盖 TS 恢复形；别名形状 kind 命名统一属投影层。

## 5. 需用户裁定：basic-token 7 项（core 改动，AI 不得自行改 `core/syntax/basic-tokens/`）

> 共同「为何不能绕」：失效点在 `core/syntax/basic-tokens/**` 的字符判据 / 收尾判据内部；
> `typescript/**` 只拿到模板配置（符号表、合符号表、数字后缀、正则模板、空白表覆写）与 AST 投影，
> **没有任何接口能改变「某 token 何时收尾 / 某字符是否并入」**；已试 `Ban` / `BanCombineSymbol`
> 会误伤合法形（如 Ban `?.` 废掉全部可选链）。来源：`docs/cover5-basic-token.md` §2.2 / §4。

| 项 | 形态 / 最小复现 | 根因（core file:line） | 方案 A 代价（推荐） | 方案 B 代价 |
|---|---|---|---|---|
| A | 行注释 lone CR：`// c\rconst a = 1;` | `line-annotation.xl.md:124`（`!== "\n"`） | 改「不是 LineTerminator」（`\n`/`\r`/U+2028/U+2029），CRLF 整体消费；core 两处判据 + 行号/行计数口径；回归网 1704 token 语料 | 声明为不支持，与 TS 永久不一致（`lex-bom.ts` 同族） |
| B | 行注释 LS/PS：`// c<U+2028>const a = 1;` | 同上（LS/PS 也是 LineTerminator） | 同 A | 同 A |
| C | shebang lone CR：`#!x\rconst a = 1;` | `shebang.xl.md:68` | 同 A（与行注释同判据） | 同 A |
| D | 字符串行续接 LS/PS：`const s = "a\<U+2028>b";` | `string/translate.xl.md:62-63` / `:135` | 行续接判据扩全 LineTerminator（CRLF 视为一个）；ts 层无需改 | 与 TS 字段差（cooked text 多 U+2028） |
| E | `?.` 后随数字：`const x = a?.5:b;` | `symbol.xl.md:58` 无条件合并 `?.` | 合符号前加 ECMAScript lookahead：下一字符是十进制数字则不合并；回归网 = 全部可选链 | `BanCombineSymbol(["?."])` **不可行**（可选链全域失效） |
| F | `\u{…}` 位数写死 1–6：`const \u{0000061} = 1;` | `common.xl.md:60/92/96`（`digits < 6`）+ `identifier-shape.xl.md:47` 同口径 | 去 6 位上限、累计值 ≤ 0x10FFFF；需防溢出并保证 `\u{110000}` 仍非法 | 保持 1–6 位，与 TS 不一致 |
| G | 带标签模板非法转义 cooked：``tag`\8` `` | `string/translate.xl.md:37/125` | NonOctalDecimalEscape 在带标签模板里标 cooked=undefined、AST 取原文；无标签模板的超集是否保留需说明 | 与 TS 字段差 1 条 |

裁定问题逐条：A/B/C「允许改两处行终止符判据吗？」、D「允许扩字符串行续接判据吗？」、
E「允许在合符号判据里加 `?.` 前瞻吗？」、F「允许去掉 6 位上限吗？」、G「允许改 translate 的 `\8`/`\9` 口径吗？」

## 6. 非真红澄清（口径记录，避免下轮重复劳动）

1. **`FirstAssignment` 节点 kind 与 TS 规范名 `EqualsToken` 不一致** —— **比较器别名归一问题，不是真红**。
   `x = 1 + 2;` 实测 TS diag=0、AST 三栏 0/0/0。原因：`ts.SyntaxKind[EqualsToken]` 的反查名就是别名
   `FirstAssignment`；`ast-compare.mjs` 的 `TS_KIND_ALIASES` 折 TS 侧，而 `groupByKind` 对**两侧**都调
   `kindOf`，本仓 `FirstAssignmentShape` 的 kind 也被折成 `EqualsToken`。快照 JSON 里
   `cj-ast.json` 原样写 `FirstAssignment` 是命名约定，不是 AST 差异。不改、不入 case。
2. **TS 自身非法的形态被排除**（尺子不测，`parseDiagnostics≠0`）：
   `module M` / `namespace N`（`'{' expected`）、`class C<T<U>> {}` / `interface I<T<U>> {}`（`',' expected`）、
   `@a[b] class C {}`、`export default enum E { A }`、`if (a) b` ⏎ `else c` ⏎ `else d;` 等。
3. **跨类别线索的正确归属**（本轮已按首要失效分派，未硬塞 case）：
   `@dec enum E {}` 与块/模板块 import 成员 = 缺少 possible（下一批）；
   装饰器尾随声明 18 条 = end-compute（首要）+ possible-build（次要）；
   `a?.<T>(b)` = possible-build（已修 + 入 possible-build.ts）。
4. **case 文件中的 base 行允许基线即绿**：IMPORTANCE §5 要求每族先给 base 再给变体；
   「真红→转绿」按族统计（各 docs 的回滚实测），不要求每一行在基线上都红。
5. **`xl_check` 的 3 个 E2004 孤儿产物**（`dist/ts/core/syntax/{add-result,branch-condition-result,branch}.ts`）
   是**基线即有**（对应 `.xl.md` 早已删除），与本轮无关；`2464 warning` 中除 3 条 E2004 外均为既有
   W3102/W3103 文档描述缺失噪音。

## 7. 合并记录与冲突解决摘要

7 个 merge commit（顺序即合并顺序，父链完整）：

| merge | parents（第一父=主仓、第二父=类别分支 tip） | 主题 | 规模 |
|---|---|---|---|
| `fe3d7f1e` | `5362a38b` + `f2afdcf9` | merge: cover5-basic-token | 5 files, +2377/−8 |
| `b59b5699` | `fe3d7f1e` + `f6881708` | merge: cover5-missing-possible | 9 files, +5765/−60 |
| `ead594e0` | `b59b5699` + `20947557` | merge: cover5-missing-end | 6 files, +4314/−19 |
| `bbe3fadf` | `ead594e0` + `f60908e3` | merge: cover5-end-build | 5 files, +6648/−12 |
| `6d65c76a` | `bbe3fadf` + `8a8b77bd` | merge: cover5-possible-build | 10 files, +6545/−14 |
| `28db1204` | `6d65c76a` + `8816a35c` | merge: cover5-end-compute | 10 files, +12103/−86 |
| `65e56f0f` | `28db1204` + `8c5cab8a` | merge: cover5-possible-compute | 11 files, +8343/−118 |

- 合并后 `git status` 干净；无真实冲突标记（§3.1 的两处 `<<<<<<< HEAD` 是基线即有的 `.txt` 围栏示例）。
- 跨类别同文件重叠已被自动合并吸收，逐点核对关键重叠：
  `typescript/tokens/declarations/enum-declaration-shape.xl.md` 同时含
  missing-possible 的**装饰器前缀**（`FromUnits`，现 :70 注释起）与 possible-build 的**计算名**
  （`BuildMember`，现 :240-254），两处改动都在，未见互相覆盖。
- `core/**`、`typescript/IMPORTANCE.md` 全程零改动（§3.1）。
- 合并前各分支 tip 与最终测试口径一致：作者分支各自读数（如 possible-build 5378、end-build 5389…）
  合并后全量 **5709/5709** 不是简单相加，而是合并后的统一复跑结果（§1、§3.3）。

## 8. 独立验证结论

**PASS**。依据：

| 核查项 | 结果 |
|---|---|
| HEAD / 7 merges / 45 文件 / core+IMPORTANCE 零 diff | PASS（§3.1、§7） |
| 七类标准文件存在 + 新增段 17/56/47/61/43/96/54 | PASS（§3.2） |
| 全量 ast-json 5709/5709、diff 5709/5709 0/0/0 | PASS（§3.3） |
| 七类单 stem 1034/1034 全一致 0/0/0 | PASS（§1） |
| token-ast 1704（ok 1694 / ts-invalid 10 / crash 0 / diff 0） | PASS（不差于基线） |
| real-dts 226/226 全一致 | PASS |
| tsc 0 error；xl_check 0 error（仅既有 warning） | PASS |
| 独立抽样 21/21（TS diag=0 且 AST 完全一致） | PASS（§3.4） |
| 同 stem 去重 0；跨 stem 精确重复 1（信息项） | PASS（§3.5） |
| tmp 未提交；工作区干净 | PASS（§3.6） |
| 总分 5335→5709（+374）与逐类增量一致 | PASS（§3.7） |

未发现 FAIL 项；无代码改动需求。下一批工作见 §4、§5。
