# xl-example Final — TypeScript 前端当前总文档

> **文档定位**：本文件取代 `docs/` 下 2026-10-20～10-22 产生的 48 份过程文档（逐份索引见附录 A），
> 只保留**当前仍成立的事实、已裁定的口径、覆盖清单、遗留缺口与复跑方法**。过程证据留在 git 历史里
> （`git show <sha>:docs/<file>`），不随本文件复制。
>
> **保留的其它文档**：`docs/xl-to-cpp.md`（C++ 目标生成契约）、`docs/cpp-design-notes.md`（C++ 三个结构性决定，
> 文内已注明哪些被实际实现取代）。**其它权威源**：`typescript/IMPORTANCE.md`（开发流程与质量规范，只允许用户改）、
> `README.md`（构建/CLI/样本，注意其 dawn 时代章节已过时，见 §1.2）、`tests/MIGRATION.md`（旧测试树来源）。
>
> **核对时点**：2026-10-22（Asia/Shanghai），仓库 `C:\Users\Admin\Documents\GitHub\xl-example`，
> 分支 `feature/quick-parse`，HEAD `c70e173d`（代码面 HEAD `2a531cb2`，其后只有 docs 提交），
> TypeScript **6.0.3** / Node **v24.21.0**。§2 读数由本次清理时亲自复跑；证据日志在 `tmp/final-gates/`（未跟踪）。
>
> **标注约定**：✅ 已复现/已实现；⭕ 仍开放；❓ 未复现或需再验；「口径」= 不是缺陷、只是尺子/约定的边界。

---

## 0. 怎么读这份文档

| 你想知道 | 看 |
| --- | --- |
| 现在能不能跑、跑出来多少 | §2、§8 |
| 解析器按什么规则工作 | §3（权威细节在 `typescript/IMPORTANCE.md`） |
| 支持哪些 TypeScript 语法、哪些还不支持 | §4、附录 B（47 个 stem 的用例数） |
| 哪些行为是用户拍板的口径 | §5 |
| 这些数字是怎么修出来的 | §6 |
| 下一批该修什么 | §7 |
| 被删的 48 份文档讲了什么、去哪找 | §9、附录 A |

> 文中「来源」「并入」列常引用 `cover9-FINAL §…`、`token-ast-analysis §…`、`coverage-* §…` 等——这些是**本次已删除**
> 的过程文档（逐份见附录 A），只作溯源；需要原文时用 `git show c70e173d:docs/<文件名>` 取回，不要按这些名字找文件。

---

## 1. 项目与当前仓库形态

### 1.1 是什么

- `*.xl.md` 是**唯一事实来源**，同一份规范可生成多个目标语言；`ts` 由 xl 打印器直出（离线、确定性、字节稳定）。
- 本仓是「用 xl 写的 TypeScript 风格语言前端」：字符流 → basic token → shape/候选树 → **TS 兼容 AST**
  （`typescript/cases/*.ts` 语料逐条与 `ts.createSourceFile` 三栏对拍）与 **XML token 树**
  （`Token.ToXmlString`，标签名取 `this.constructor.name`）。
- 构建链路：`*.xl.md --xl build--> dist/ts/**/*.ts --tsc--> build/ts/**/*.js`。`dist/`、`build/` 均被 `.gitignore` 忽略。

### 1.2 当前仓库形态（与 README 有出入，先读这一节）

- 2026-10-13 的 `1cf6d30d`「删除 dawn 旧语言层、core/runtime 与全部重组机制」之后，本仓**只剩 `core/` 与
  `typescript/` 前端**，`dawn/` 目录已不存在。
- 根入口 `cjcli.xl.md` 自 2026-09-30 后未更新，`# dependencies` 仍 `import "./dawn/text/text-document.xl.md"` 等
  → **根级 `xl build` 报 2 条 E1006（`cjcli.xl.md:5/6` 的 `./dawn/text/*` 不存在），
  2026-10-22 的 dryRun 实测 0 written / 0 skipped / 0 planned**；
  因此 `dist/ts/cjcli.ts`、`build/ts/cjcli.js` 不存在，
  `samples/check.mjs`、`bin/cjcli.js` 在当前 HEAD **跑不起来**（不是解析缺陷，是仓库形态）。
- 当前**唯一可复跑口径**是定向构建 `core` + `typescript`（`xl_build(paths=["core","typescript"])` → `tsc`）。
  README 的「解析优先级在哪」「cjcli」「样本验收」三节与 `dawn/**` 一起过时；「已知缺口」一节也已过时（§7.4 已核实）。
  README 已加状态提示，指向本文件。
- `tests/` 整套从 `feature/print-direct-ast` 搬来，`tests/parse/*` 是**旧分支的尺子**，本分支不以它为准；
  本分支权威的尺子是 `typescript/cases/{ast-json,ast-json-diff,token-ast,real-dts-ast}.mjs` 与 `tests/parse/validate.mjs`。

### 1.3 目录地图

| 路径 | 内容 |
| --- | --- |
| `core/` | 语言无关层：`exceptions/`、`extensions/`、`syntax/{basic-tokens,messages,templates}/`、`syntax/*.xl.md`（`catalog-guide`、`process-source`、`token`、`branch-*`、`shape-*`、`possible-shape(-cache)`、`source*`、`syntax-context` 等） |
| `typescript/tokens/` | TS 语法层，按家族分目录：`aliases bindings declarations expressions files jsdoc jsx keywords literals members names punctuation statements synthetic trivia types`（`*.xl.md` 是规范，禁止散文） |
| `typescript/ast/`、`typescript/run/` | AST 节点规范；语言模板（`typescript-template`、`typescript-symbol-template`、`regex-template`、`line-terminator` 等）与 `source-file-runner` |
| `typescript/cases/` | 47 个语料 stem + 尺子（`ast-json`、`ast-json-diff`、`ast-compare`、`token-ast`、`real-dts-ast`） |
| `typescript/{exec,runtime,stdlib}/` | 从另一分支继承的执行/运行/标准库语料相关产物（本前端不依赖其运行） |
| `tests/` | 旧测试树（`MIGRATION.md` 说明来源）；`tests/cover9/` 是 cover9 候选库与 `probe.mjs` |
| `samples/`、`bin/` | 样本与 `cjcli` 薄包装（当前不可构建，见 §1.2） |
| `docs/` | 本文件 + 两份 C++ 规范 |

### 1.4 构建注意

- `xl` **不在 PATH**；在会话里用 `xl_build` 工具（参数 `cwd`、`paths`、`targets:["ts"]`、`out:"dist"`）。
- `*.xl.md` 必须 **UTF-8 无 BOM + LF**，否则 `xl_build` 报 E0005（PowerShell 5.1 的 `Set-Content -Encoding utf8`
  会写 BOM+CRLF，别用它编辑规范）。
- 不传 `paths` 的根级构建会被 `cjcli.xl.md` 的 dead import 中止（见 §1.2），且可能一个产物都不写。

---

## 2. 当前状态：固定门禁读数

以下为 **2026-10-22 本次清理时亲自复跑** 的读数（HEAD `c70e173d`，代码面 `2a531cb2`）：

| # | 门禁 | 命令 | 实测 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | 语料 AST 生成 | `node typescript/cases/ast-json.mjs` | **6167 case / 47 stem，cj-ok 6167，cj-fail 0** | ✅ |
| 2 | 语料 AST 对拍 | `node typescript/cases/ast-json-diff.mjs` | **6167/6167 完全一致；结构差 0 / 位置差 0 / 字段差 0** | ✅ |
| 3 | token 语料尺子 | `node typescript/cases/token-ast.mjs --quiet` | **total=1715，ok=1705，crash=0，diff=0，ts-invalid=10，gap-now-passing=0** | ✅ |
| 4 | 语料文件体检 | `node tests/parse/validate.mjs` | **1719 条用例，0 条不合格**（exit 0） | ✅ |
| 5 | 真实 `.d.ts` 门禁 | `node typescript/cases/real-dts-ast.mjs` | **226 份：解析成功 226、崩溃 0；AST 完全一致 226、差异 0** | ✅ |
| 6 | 类型检查 | `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | **exit 0**（无输出） | ✅ |
| 7 | 规范结构检查 | `xl_check(cwd=主仓, paths=["core","typescript"], targets=["ts"])` | **864 file(s)，0 error，2466 warning**；3 个 E2004 孤儿（`dist/ts/core/syntax/{add-result,branch-condition-result,branch}.ts`，仓库既有） | ✅（只认 error=0） |
| 8 | cover9 候选探针 | `node tests/cover9/probe.mjs` | **88 候选：red=0 / green=88**（A 45+B 22+C 21）；存储值有 44 条红基线不一致 → **exit 1 为预期** | ✅ |
| 9 | 样本逐字节 | `node samples/check.mjs` | **当前不可运行**：`build/ts/cjcli.js` 不存在（根入口死依赖 dawn，§1.2） | 口径 |

补充事实：

- `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` = **空**（core 与 IMPORTANCE 全程零改动）。
- 本次复跑前工作区只有未跟踪的 `?? tmp/`；`tmp/` 从入库。
- cover9 独立终验（`f7568a95`，代码面 HEAD `2a531cb2`）为 **PASS**：九个 merge 全部在链上、41 项读数复核、
  probe 88 条 live 全绿、独立抽样 **55/55「修前红（4d2dafe3 基线构建）→ 修后绿」**、新增用例 **238（5929→6167）**
  且 append-only。本次复跑与之一致。
- 47 个 stem 的逐 stem 用例数见附录 B；其中 cover9 主修的 7 个 stem 为：
  basic-token 221、end-build 251、end-compute 318、missing-end 142、missing-possible 157、possible-build 198、
  possible-compute 205（7 stem 合计 1492，cover9 起点 1254，+238）。

---

## 3. 架构与开发规范

权威原文是 [`typescript/IMPORTANCE.md`](../typescript/IMPORTANCE.md)（只允许用户编辑）；本节是给「接手的人」的摘要，
冲突时以 IMPORTANCE 为准。

### 3.1 五阶段开发流程（顺序固定）

1. **字符由 basic token 承接**。共 8 种：`AreaAnnotation`、`LineAnnotation`、`RegexToken`、`String`、`Bracket`、
   `WrapSymbol`、`Symbol`、`Common`；注释与空白是 trivia。**`core/syntax/basic-tokens/` 的修改只能由用户发起**，
   AI 不得自行改。
2. basic token **close 时触发父级 `ComputePossibleShapes`**，尝试构建 shape。
3. **compute possible**：`CatalogGuide` 同时持有 `PossibleShapes`（普通候选）与 `EndPossible`（终结候选），
   `ComputePossibleShapesByIndex` 的判定顺序：
   形参校验（`context` 必须由形参传入，否则当场抛错）→ 越界返回 `Nothing` → 淘汰（`Reject` 移出候选；
   `Accept`/`Uncertain` 只表示「还活着」）→ 终结候选 Accept（`Candidates==0` 则 `BuildByIndex` 并
   `SignOut→TryToClose→Quit`；`Candidates>0` **抛错**「既像结束、又像还能长」）→ 零候选且无终结候选 **抛错**；
   有终结候选则 `Waiting` → 多候选 `Waiting` → 唯一候选先问 `IsBuildable`（默认 `true`），`true` 才 build。
4. **shape 的两种去向**：**立即关闭**（静态工厂里签范围、取字段、`TryToClose()`）或 **未关闭 + 挂载**
   （`host.MountedUnit = shape`，后续字符继续流入，直到终结候选签名关闭）。
5. **shape 转 AST 节点**：basic token 的数据必须在 **build 那一刻**全部提取到 shape 字段上，basic token 用完即丢弃；
   shape `Close` 后 `Data` 等价于 AST children；AST 由 `ParseFromShape(shape)` 产出。

硬性规则（IMPORTANCE §3）：

- shape **禁止**用 `ExitOrPre` 结束自己，**禁止**覆盖 `ExitOrPre` / `ComputePossibleShapes`。
- basic tokens 要么被真实消费（丢弃），要么走 `Reload Message`，禁止其它操作。
- **cache 必须两阶段共用**：`Compute`/`ComputeByIndex` 用 `PossibleShapeCache` 记录扫描进度，
  `BuildByIndex` 复用同一份（不要用 `ItemUtil.ItemStart` 重算）。越界时 n=4000 的微基准：不用 cache 112.73ms、
  用 cache 0.33ms（约 **340 倍**），曲线从二次变平。
- **区间口径**：shape `SourceRange` 是**闭区间**；shape 的 `Pos` 含前导 trivia（= 前一个非 trivia 单元 `End.Index+1`，
  与 TS `pos` 同口径）；AST `Pos/End` 是**左闭右开**；换算只发生在 `ParseFromShape`（`Pos = shape.Pos`、
  `End = SourceRange.End.Index+1`），shape 层不得为迁就 AST 改区间。

### 3.2 分层与开关

- **core 只提供语言无关的开关/钩子，且默认值 = 历史行为**；TypeScript/ECMAScript 的语义只在
  `typescript/run/*template*` 里覆写启用。历史上每一轮都以 `git diff -- core typescript/IMPORTANCE.md` 为空作为验收项
  （本次复核仍为空）。
- 新增能力走「默认关的开关 + ts 层覆写」，不把语言事实写进 core。
- 语言配置（关键字表、禁用方法名表等）挂在模板上；候选表在 `typescript/tokens/**` 的 `*-possible-shape` /
  `*-shape` 里，按 §3.1 的流程增减。

### 3.3 「七类问题」分类法与五问

任何 shape 层问题先归入七类之一（IMPORTANCE §6）：

| 类别 | 典型症状 / 快速判据 |
| --- | --- |
| basic token 存在问题 | 字符没归成正确 token（关键字/符号/转义/空白归属错）→「缺少标识符」「不支持的表达式起点」；**加 `;` 无效**；只能用户裁定 |
| 缺少 possible | 整类形态没有候选（新语句形状、`@` 起头声明、泛型箭头、块体终结候选、`export as namespace` 兜底等）→ 直接抛「不支持的表达式起点」/ CatalogGuide 共存 |
| 缺少 end | 能成形但没有收口通道（块体只认 `;`、`import=`/`export=` 只认 `;`）→ **加 `;` 即过** |
| possible compute 不对 | Accept/Reject 时机错（EOF 哨兵、修饰词 vs 名字、关键字升级、`<` 多实参、换行后 `;` 归上一条）→ 去尾随换行即绿 / CatalogGuide 共存抛错 |
| possible build 不对 | 已 Accept 但单元集被切碎或文法缺档（裸 `,` 切声明不看 `<>` 深度、形参模式未路由、类型文法缺口）→ build 期 throw |
| end compute 不对 | 边界判错（ASI 缺换行、行注释分支、`;` 归属、前缀运算符、类型段不认换行）→ **吞下一条**，「没有读完」家族；加 `;` 即绿 |
| end build 不对 | 收口格对但 End/字段取值错（尾随 trivia 撑大 End、零宽节点落点、`FromUnits` 强制 `;`）→ 多为位置差右端多 N 格 |

**五问模板**（写修复报告/评审时必须回答）：① 正确的应该什么时候 build；② build 时提取哪些信息；
③ 什么时候 close；④ close 时提取哪些信息；⑤ cache 怎么复用。build 只发生在四种格：`;`、闭合 `}`/`)`/`]`/`>`、
**换行 ASI**、**EOF 哨兵**；`SignIn(首单元)`、`SignOut(最后非 trivia 的 End)`、`Pos = Positions[first]`，
**trivia 只进 Pos 不进 End**。

经验判据（来自已修 191 条 token 语料失败）：token 化不是主因（8/191），**主因是「在哪一格结束」与
「build 拿到的是不是完整单元集」**（end 收口族 71、build 提取族 70、候选族 42、basic token 8）。

### 3.4 用例与尺子规范

- 每个语句形态**先一条 base**（无干扰信息），再叠加 **trivia**（前后空格/注释/词间换行/行尾注释）与
  **重复形**（多个导入项/多条成员/同文件多语句）；一行一个用例。
- oracle 是 `ts.createSourceFile(..., ScriptKind.TS).parseDiagnostics`：**只有 diag=0 才入尺子**；TS 自身非法的形
  只记录行为、不计失败。TS 的「静默恢复」形只有用户裁定后才追（已裁定：匿名 `class {}`；`throw` 换行恢复形也已对齐）。
- 用例**只增不改**（append-only）；快照由 `ast-json.mjs` 生成，**禁止手工拼 JSON**；同 stem 冲突时两段都留再重生成。
- 含 lone CR / U+2028 / U+2029 / NEL 的用例文件用根 `.gitattributes` 的 `-text` 钉死字节（现有规则：
  `basic-token.ts`、`end-compute.ts`、`possible-build.ts`、`possible-compute.ts`、`cover6-*.ts`、`*-cr*.ts` 等），
  写用例时 CR/LS/PS 用行内字面字符（`\n` 仍写转义）。
- `// xl:known-gap` 文件头标记已通过的既知缺口，token-ast 里计入 `gap-now-passing` 而不是 ok。

---

## 4. 覆盖清单

完整清单以 `typescript/cases/*.ts` 的 47 个 stem 为准（附录 B）；本节是分类摘要与**真正还没覆盖**的边界。
标注：✅ 已覆盖并全绿；⭕ 仍暂缓；口径 = 不是待办。

### 4.1 basic token 层

| 主题 | 状态 | 要点 |
| --- | --- | --- |
| 8 种 basic token | ✅ | 见 §3.1；注释/空白为 trivia |
| 正则 `RegexToken` | ✅ | 起点 = `RegexTemplate.CanStartAt` 纯词法判据 + `TypeScriptRegexTemplate.CanStartAt` 位置启发（控制头 `)` 后、裸块 `}` 后、`else`/`do` 尾、箭头体 `}` 后换行等）；`text` 含两端 `/` 与 flags；flags 解析期不校验；历史设计里的 `RegexStartAfter` 登记通道**仍在但无写入点**（见 §7.3） |
| 字符串 / 模板串 | ✅ | 三处职责：`StringTemplate`=语言事实（引号/转义/行终止符/内插开关）、`StringGuide`=认形状、`String.Default`=按字符收（`$` 记 `PendingInterpolation`，见 `{` 才开内插）。`text` 是去定界符的 cooked；词法层把 `${…}` 收成 `String IsSupportInterpolation=True` + `ConstString`/`InterpolationString`；形状层按它切 `NoSubstitutionTemplateLiteral` / `TemplateHead` / `TemplateMiddle` / `TemplateTail` / `TemplateExpression` / `TemplateSpan` / `TaggedTemplateExpression` |
| 字符串转义 | ✅ | `\uXXXX`、`\xNN`、`\u{…}`、代理对、NonEscape、八进制、续行、模板内 CRLF 归一、带标签模板非法转义取原文；`\u{…}` 位数不限、码点 ≤ U+10FFFF（越界以 `MaxUnicodeCodePoint()+1` 标记为非法） |
| 行终止符 | ✅ | 行注释/`String`/Shebang 收尾：`Template.LineTerminatorChars` core 默认 `"\n"`，ts 覆写 `"\n\r\u2028\u2029"`；`StringTemplate.LineTerminatorChars` core 默认 `["\n","\r"]`，ts 加 LS/PS；共享 `typescript/run/line-terminator.xl.md`（CRLF 算一）；`-text` 夹具覆盖 lone CR |
| U+0085 NEL | ✅ | **用户裁定**：按 TS 词法算**空白**（`isWhiteSpaceSingleLine` 的 `nextLine`），只改 ts 层 `IsWhiteSpace`，core 零改动；**NEL 不是行终止符**，`isLineBreak` 不含 0x85，不得放进 `LineTerminator` |
| U+FEFF BOM | ✅ | `Bom` basic token；**只允许** index 0 或前面只有 trivia；mid-code BOM 不支持 |
| shebang `#!` | ✅ | `Shebang` basic token；index 0 或 `BOM.End+1`，吞到行终止符前；BOM+shebang 的超集行为被有意接受（TS 报 2 条诊断，不入尺子） |
| `$` 作标识符字符 | ✅ | 用户裁定从 core 符号表移除（不是 per-language `Ban`） |
| `>>` / `>>>` | 口径 | token 层**不拆**（保持合符号）；类型位置由 `TypeBuilder` 按字符拆成虚拟单 `>`；表达式位 `f<T<U>>(a)` 是否拆属 basic token 决策，未定（当前 0 红） |
| 上下文关键字升级 | 口径 | `async` 等「什么时候升级成关键字」的归属未统一定论（建议判据留在 parser）；孤立 `declare;`/`abstract;` 是否 token 层不升级未定 |

ts 层对 core 的模板覆写（长期口径）：`Template.LineTerminatorChars`、`StringTemplate.LineTerminatorChars`、
`StringTemplate.StrictTemplateEscapes=true`、`StringTemplate.AllowLongUnicodeBraceEscape=true`、
`SymbolTemplate.SupportUnicodeEscapeIdentifier`、`SymbolTemplate.IsCombineBlocked`（`?.` 后跟数字不合并）、
`RegexTemplate.CanStartAt`。

### 4.2 语法家族

| 家族 | ✅ 已覆盖（摘要） | ⭕ 仍暂缓 / 口径 |
| --- | --- | --- |
| statements | `if/else`（含注释/空体/换行）、`for/foreach/while/do`（含 do 尾分号可省）、`try/catch/finally`、`switch`、`with`、`debugger`、`using`、`return/throw/break/continue`、标号语句、ASI 全组合 | `catch` 绑定默认值：`try {} catch (e = 1) {}` TS `diag=0` 但本仓 **crash**（见 §7.1，新发现）；`catch (...e)` 本身 TS 非法（diag=3，口径） |
| declarations | class/interface/function/enum/namespace（`module`）/type alias/import/export/import-equals、修饰词与装饰器、无体签名、abstract 成员、参数装饰器、抽象访问器、`declare`/`global` 增强 | 字面量名绑定 `let { "s": a } = o;`：TS `diag=0` 但本仓 **crash**（见 §7.1，新发现）；`enum E { [k] = 1 }`、`class C<T<U>>`、`f<T<U>>(a)` 实测已 MATCH（旧文档「暂缓」已过时）；`export abstract` ⏎ `class`、`export declare` ⏎ `type/interface` 是 TS 非法形（diag≠0，口径） |
| types | TypeBuilder 全档：引用/泛型、联合/交叉、条件/infer、映射、元组/命名元组、模板字面量类型、类型算子、索引访问、`import()`、`typeof`、谓词、字面量、`this`、括号、rest、函数/构造类型、对象类型成员（属性/方法/调用/构造/索引签名，`readonly`/`new`/可选/同行判据）、JSDoc 后缀 | 无「族级」暂缓；剩余是零点形态，随 §7 下一批处理 |
| expressions | 全部一元/二元/赋值/可选链、箭头（含泛型/async）、class 表达式、对象/数组字面量与展开、模板/标签模板、调用/`new`/instantiation（`f<string>` 无调用形）、`as`/`satisfies`/尖括号断言、`yield`/`await` 上下文、`import.meta`/`new.target`、动态 `import()`、`#` brand check | `class extends (class {})` 实测已 MATCH（旧文档暂缓过时）；语句首裸 `[a, b];` 已放行（CanStart 放行 `(`/`[`/`<`/`#`/`!~+-`/`++/--`；`{` 仍不放，块/对象二义） |
| members / 对象字面量成员 | 方法/访问器/generator/async/computed/optional private、泛型方法、返回类型/谓词 | 无族级暂缓 |
| bindings | 对象/数组解构（含嵌套、rest、默认值、rename、computed name）、形参模式与默认值 | 字面量名绑定见上（real gap） |
| literals / number / regex 语料 | 数字（进制/分隔符/大整数）、字符串（全部转义）、正则（`regex.ts` **273** 条；早期分组为 167 正则 + 89 除号） | 正则正文里的真 `\n` 写不进语料（`decodeCaseText` 只展开 `\n`，字面量内不展开）；空正则只能 `/(?:)/` |
| import / export / module | import attributes、`import defer`、type-only（含 inline specifier/type-star）、import-equals、`export =`、`export default`、`export as namespace`、namespace/module 块、ambient module、`global {}` 增强、模板块内 import/export、`export import type A = B.C` | `export` 家族三处「换行后 TS 的 pos≠0」属**尺子口径**问题（不是实现缺口） |
| class/interface members | 字段/方法/访问器/构造器/索引签名/调用与构造签名、修饰词同行判据（`readonly`/`new`/`declare`）、abstract 访问器、static 块（AST 已 MATCH） | `class C<T<U>>` 是 TS 非法（diag=2，口径） |
| end / possible / ASI | 四个专项 stem（`end`、`end-build`、`end-compute`、`missing-end`、`missing-possible`、`possible-build`、`possible-compute`）：ASI 四条件（+ 第 5 条声明起点边界）、EOF 收口与零宽补齐 `;`、装饰器声明头、匿名无体 `export default function`、匿名 `class {}` 恢复、`global {}` 尾随、模板块成员分派 | 见 §7.1（W1/W3/装饰器/块内 declare 仍开放） |
| 真实 `.d.ts` | **226/226** 解析成功且 AST 逐节点一致（`typescript/lib`、`@types/node`、undici-types）；固定门禁 `npm run ast:dts` | 门禁固定本机这 226 份，更多 `@types` 未纳入 |
| JSX / TSX | ❌ **不支持**（IMPORTANCE §8；`<div/>` 在 .ts 下本仓 crash，TS 也 diag≠0，属口径） | 永久不支持 |

### 4.3 尺子（harness）本身

- `ast-json.mjs`：读 `typescript/cases/*.ts`，一行一用例（行内 `\n` 由 `decodeCaseText` 还原成真换行），
  生成/更新 `*.cj-ast.json` / `*.ts-ast.json` 快照；`ast-json-diff.mjs` 逐条与 TS 三栏对拍。
  归一内核只有一份 **`typescript/cases/ast-compare.mjs`**（`TS_KIND_ALIASES`，含 `FirstStatement→VariableStatement`、
  `FirstNode→QualifiedName`、`FirstTypeNode→TypePredicate`、`LastTypeNode→ImportType`、
  `FirstContextualKeyword→AbstractKeyword`、`AssertClause→ImportAttributes` 等）——旧文档「两个文件各加一行别名」已过时。
- `token-ast.mjs`：一**文件**一用例（`tests/cases/token/**`，去 BOM、不做行内 `\n` 解码）；四态 `ok/crash/diff/ts-invalid`，
  `crash` 展开 `InnerException` 链（≤12 层）取最内层消息；支持 `--quiet`、`--fail-only`、`--json <path>`、路径/glob 过滤；
  **选中集合内有 crash/diff 才 exit 1**（ts-invalid 不计），可当门禁。当前 total 1715。
- 快照副作用：历史归一化把 26 份 `*.ts-ast.json` 的 **932 行 kind 改成规范名**；再归一幂等、读数不变，
  但重生成会产生大 diff——不是回归。
- 归一/对拍定义只有一处，三处共用；旧 `tests/parse/*` 的尺子读另一分支产物，不作为本分支证据。

---

## 5. 关键裁定与口径

| 主题 | 裁定 / 口径 | 来源 |
| --- | --- | --- |
| core 与 basic token 修改权 | `core/syntax/basic-tokens/` **只能由用户发起修改**；AI 只做 ts 层覆写（core 零改动） | IMPORTANCE §3.1；cover5/9 |
| 分层 | core 开关默认 = 历史行为；TS 语义只在 `typescript/run/*template*` 启用；每轮 `git diff -- core typescript/IMPORTANCE.md` 必须为空 | cover6 §4①、cover9 §2 |
| NEL | 按 TS 词法算空白（ts 层 `IsWhiteSpace`），**不是行终止符**，禁入 `LineTerminator`；`return<NEL>1` 仍带表达式 | cover9-basictoken、cover9-FINAL §9 |
| `$` | core 符号表删除，`$` 可作标识符字符 | basic-token-scenarios §2 |
| BOM | `Bom` token，仅 index 0 / 前面只有 trivia；mid-code 不支持（超集策略，不入尺子） | basic-token-scenarios §4 |
| shebang | `Shebang` token，index 0 或 `BOM.End+1`，吞到行终止符；BOM+shebang 超集有意接受 | basic-token-scenarios §5 |
| 正则起点 | `RegexTemplate.CanStartAt` 纯词法 + `TypeScriptRegexTemplate.CanStartAt` 位置启发；`RegexStartAfter` 登记通道保留但无写入点 | regex-token-analysis、`typescript/run/typescript-template.xl.md` |
| Unicode 上限 | 唯一常量 `Common.MaxUnicodeCodePoint()`=U+10FFFF；位数不限，越界封顶 `Max+1`；标识符与字符串同口径 | cover6 §3F、cover7 |
| 字符串 cooked | 模板/标签模板/普通引号串按「超集」口径取原文（非法转义 `\8`/`\9` 取原文）；默认 core 行为历史、ts 覆写 | cover6-FINAL §3、cover7 |
| 匿名 class 恢复 | 用户裁定追 TS **静默恢复 AST**：块体/语句位 `class {}` 建无名字 `ClassDeclaration`；更松恢复形不追 | cover9-possbuild-class §0、FINAL §11-2 |
| TS 非法形 | `parseDiagnostics≠0` 只记录行为、不入尺子、不为对齐改 shape | 各轮口径；token-ast 10 份 ts-invalid |
| TS 恢复形 | 只有用户裁定才追；已追：匿名 `class {}`、`throw` 换行零宽 `Identifier` | cover8 §8、real-dts §9 |
| 用例策略 | append-only；先 base 再 trivia/重复形；快照只由 `ast-json.mjs` 生成，禁手工 JSON | IMPORTANCE §5、cover9 §6 |
| 字节级夹具 | 含 lone CR/LS/PS/NEL 的 case 文件用 `.gitattributes -text` 钉死；写行内字面字符 | `.gitattributes`、cover9 §6 |
| probe 基线 | `tests/cover9/candidates.json` 的 **44 条红基线刻意保留**（修复前证据），probe 因此 exit 1；**不要更新** | cover9-FINAL §3/§11-8 |
| 已知失败计数 | token 语料的 10 份 ts-invalid **明确不修**（TS 自身恢复，不为对齐改 shape） | token-ast-analysis §6.4 |
| `xl_check` | 只认 `error=0`；2466 warning（W3102/W3103 文档类）+ 3 个 E2004 孤儿是基线噪音，计数会随文件数漂移 | cover5 §6.5、cover9 §2 |
| `tests/gates` 环境门 | 不在本分支口径（`tests/` 来自另一分支） | tests/MIGRATION.md、cover6 §8.6 |
| 文档策略 | 本文档是 docs/ 唯一汇总；新轮次追加 §6/§7，不再新开过程文档；过程证据进 git commit/`tmp/`（不提交） | 本次清理 |

---

## 6. 历史轮次与验证记录

### 6.1 cover 轮

| 轮 | 起点→终点（代码面） | ast-json | 增量 | 内容与结论 |
| --- | --- | --- | --- | --- |
| cover5 | `5362a38`→`65e56f0f` | 5709/5709 | +374 | 七类问题；core 七项 A–G 交用户裁定；单 stem 1034/1034 |
| cover6 | `99f286d8`→`1b8e2060` | 5784/5784 | +75 | core A–G 落地：行终止符 lone CR/LS/PS、字符串行续接、`?.` 数字前瞻、`\u{…}` 去 6 位上限、标签模板非法转义；core 审计 9 文件 |
| cover7 | `1fff4711`→`3aa2370d`（文档终点 `3fcd2e37`） | 5797/5797 | +13 | 字符串 `\u{…}` 位数统一（`AllowLongUnicodeBraceEscape`） |
| cover8 | `3fcd2e37`→`cfb06914` | 5929/5929 | +132 | A：U+2028/29 作 ASI 断句点；B：装饰器尾随声明；C：块内 import/export、ExportAssignment、模板块 export；D：export 家族调用位 ASI |
| cover9 | `4d2dafe3`→`2a531cb2` | **6167/6167** | +238 | 44 handoff + 75 survey：同行判据（`type`/`declare`/`readonly`/`new`/类型实参）、换行守卫+装饰器声明头、EOF 收口、匿名 class 恢复、NEL；probe red0/green88；独立抽样 55/55 修前红→修后绿 |

cover9 的九个 merge（也是回滚按批的边界）：

`4d2dafe3`（起点）→ `3a47b46d`(endbuild) → `b465cf6e`(missingpossible) → `bf70da06`(endcompute) →
`11d11e5a`(possiblebuild) → `b90f85f3`(basictoken-nel) → `c8009972`(possbuild-class) →
`f014e903`(posscompute-decl) → `f8579977`(missingend) → `2a531cb2`(posscompute-type)。

**回滚**：整体 `git reset --hard 4d2dafe3`；单批 `revert -m 1 <merge>`。cover5–8 的轮次回滚点依次为
`5362a38` / `99f286d8` / `1fff4711`（终点 `3fcd2e37`）/ `3fcd2e37`。

### 6.2 更早的收敛（round 21–26 及覆盖轮）

- **44 份失败 → 0**（35 crash + 9 diff，round 21–26）：机制→组的对应为 ASI 两入口不同源、类型扫描不认 ASI、
  形参门槛只认 `typed‖headIsRest`、heritage/装饰器前缀、模块体第二份分派表、`>>` 拆分使宿主 `Data` 变长导致整数下标缓存失效、
  终结候选 Accept 前 Candidates 须空、声明体 `{` 换行被标号头挡住、`new`×标签模板、孤立 `declare/abstract`、
  `throw` 换行零宽 Identifier、块 `}` 后 `/` 未收口、do 块体没收住。终态 `840258dc`：
  token **1690 ok / 0 crash / 0 diff / 10 ts-invalid / 3 gap-now-passing**（total 1703），ast:cases 4848/4848，
  ast:dts 226/226。原登记的两条 known-gap（`gap-r1231`、`gap-r1237`）最终**已修，不再接受为 known-gap**。
- **语料演进**：ast:cases 从 782（表达式轮）→ 1097 → 1734 → 3144 → 4087 distinct（task-309 去重基线，+0/−162，
  `f62fca13`）→ 4848 → 5929（cover8 终）→ **6167**（cover9 终）；构造数 47。
- **real-dts**：修前 226 份中 112 份崩溃（全部合法 TS）、114 份一致；15 个根因 → 修后 **226/226**；
  语料洞（`typescript/cases` 只保证节点种类覆盖，不保证源码形态）由 `tests/cases/token/**` 1715 份真实文件补上。
- **验证方式**：每轮终验由不写修复代码的独立成员复跑（fix 前 clone 构建 vs HEAD 构建对照），不接受作者自报；
  cover9 的 55/55 抽样即这一方式的产物。

---

## 7. 遗留缺口与下一批候选

> 判定基准：本仓代码面 `2a531cb2`（HEAD `c70e173d`）。本节所有「⭕ 仍开放」都用 §7.1 的最小探针复现过；
> 「❓ 需实测」是文档登记但本次未复现的项。

### 7.1 已复现的开放缺口（建议下一批）

| # | 现象 | 最小证据（本次实测） | 影响 / 修法方向 |
| --- | --- | --- | --- |
| O1 | **无体签名把后续语句吞成函数体**（cover9 W1） | `export default function (): void` ⏎ `z = {};`：TS 为 `VoidKeyword` + `ExpressionStatement`+对象字面量；本仓多出 `Block`（把 `z = {};` 当函数体）；`foo({});` 变体丢 `ExpressionStatement` | end build / missing-end：候选需按「参数表 / 返回类型 / 下一语句起点」三分；见 cover9-missingend §8-2 |
| O2 | **模板块成员 `declare` 换行**（W3） | `declare module 'm' { declare` ⏎ `enum E { A } }`：diff `DeclareKeyword+1 / ExpressionStatement−1 / Identifier−1`（TS 把 `declare` 当前置修饰词） | 需动 `module-block-shape` 的成员分派；cover9-posscompute-decl §9-1 |
| O3 | **装饰器 + `export` 声明仍崩** | `@dec` ⏎ `export enum E { A }` → crash「throw by line 0」；`@dec` ⏎ `export function f(): void;` → crash「函数声明缺少 function 关键字」；`@dec` ⏎ `export type T = 1;` 已 MATCH | 两条装饰器路径（`StatementScanner.IsDecoratedDeclarationStart` 与 `statement-builder.ScanDecoratedHead`）仍两份；cover9-endbuild §8 |
| O4 | **块内声明 + `global {}`** | `{ declare function gf(): void` ⏎ `global {} }`：diff 缺 `ModuleDeclaration`/`ModuleBlock` | 块级 `BuildFunctionDeclaration` 按 `IsBodyBrace` 找体；cover9-missingpossible §9-1 |
| O5 | **字面量名绑定**（本次新发现，不在 cover9 清单） | `let { "s": a } = o;`：TS `diag=0`，本仓 **crash「绑定元素缺少名字」** | bindings 的绑定元素名只认标识符/计算名；`typescript/tokens/bindings/**` |
| O6 | **catch 绑定默认值**（本次新发现，不在 cover9 清单） | `try {} catch (e = 1) {}`：TS `diag=0`，本仓 **crash**（外层消息 `throw by line 0`，需展开内层异常） | 属 end build/possible build 的形参模式路由。按 oracle（`parseDiagnostics=0`）它是真红；但该写法是 JS 早错误，**入尺子前需用户裁定**（若裁定排除则只记录行为，不修） |

### 7.2 代码级隐患（登记，本轮未复现为失败）

| # | 项 | 现状 |
| --- | --- | --- |
| H1 | `IsAsiBoundary` 的 `<` 判边界依赖调用方换行守卫；EOF 让位分支带 `ItemStart > 0` 前提（W4） | 本次测 `let a = 1` ⏎ `let b = 2` 与 `type T = A` ⏎ `b < c;` 均 MATCH，说明该形态未触发；保留为隐患（cover9-endcompute §10-3/4） |
| H2 | **手写空白表未统一**（W5） | 已复核：`typescript/tokens/expressions/expression-builder.xl.md:964-968` 的 `IsWhitespaceChar` 与 `typescript/tokens/statements/statement-scanner.xl.md:1091/1133` 的 `NextChar`/`NextWord` 仍是手写 `" \t\r\n\v\f"`，未接共享 `IsWhiteSpace`/`LineTerminator`；`NextChar` 跳过 `//` 时只认 `\n`（LS/PS/CR 行注释有风险，未实测）。**NEL 不得作为行终止符加入** |
| H3 | 装饰器两条路径的一致性 | 见 O3；另有 `@dec` ⏎ `export enum/function/type` 退表达式兜底（cover9-endbuild §8） |

### 7.3 口径性开放（不是「缺陷」，但决定下一批做什么）

- **TS 非法形不测**：`export type` ⏎ `T = 1`（TS diag=1，本仓 crash）、`export declare` ⏎ `function`（TS diag=1，本仓能 parse）、
  `export abstract` ⏎ `class` 等；行为差异只记录，不为对齐改 shape。
- **更松的静默恢复形**：只按用户裁定追了匿名 `class {}` 与 `throw` 换行；`class extends {}`、`declare class {}`、
  `class extends (class {})` 本次实测 MATCH；更松的 TS 恢复形未系统追（cover9-FINAL §11-2）。
- **mid-code BOM** 不支持（仅 index 0 / 前面只有 trivia）；BOM+shebang 超集有意接受。
- **`>>` / `>>>`**：token 层不拆；类型位由 `TypeBuilder` 虚拟拆；表达式位 `f<T<U>>(a)` 本次已 MATCH，
  但「token 层是否拆」的决定仍留给用户（basic token 权限），当前 0 红。
- **上下文关键字升级归属 / 孤立 `declare|abstract` 归层**：未定论（G12），建议判据留在 parser。
- **字符串模板恢复树**：未闭合串/空内插的合成节点（空 `LastTemplateToken`/空 `Identifier`）、无诊断通道（只对齐 `text`）、
  C# `{{` 未对拍、raw/verbatim 在 EOF 的向导未决、模板 `raw` 原文不在 `Data`（AST 只比 `text`）。
- **正则机制**：`RegexStartAfter` 登记通道无写入点（通用机制未成立）；空正则只能 `/(?:)/`；正则正文的真 `\n`
  进不了语料（`decodeCaseText` 只展开 `\n`）。
- **语句层 `yield`/`await` ASI** 与**模块顶层 `await`**：本次 `yield` ⏎ `(x)`、顶层 `await f()` 均 MATCH；
  受限产生式的更细组合仍需补语料（cover9-possiblebuild §6）。
- **CRLF 不可进 case**：行内 CR 可以（靠 `-text`），CRLF 会被解码/归一破坏（cover9-missingend §8-3）；
  这是尺子限制，不是解析限制。
- **`\u{…}` 花括号转义标识符**：本次 `const \u{61} = 1;`、`const \u{0000061} = 1;` 均 MATCH——**已实现**，
  旧文档的「仍开放」不要重复报告。
- **ast:dts 语料固定**：门禁固定本机 226 份 `.d.ts`，更多 `@types`/别的 TS 版本未纳入；`typescript.js` 打包文件
  （JavaScript 而非声明）不在门内。
- **`tests/gates` 下 8 道门**：多数是旧分支的尺子/环境门，不作为本分支验收（cover6 §8.6）。
- **JSX/TSX**：永久不支持（IMPORTANCE §8）。

### 7.4 已核实关闭（不要重复报告）

- **README 旧「已知缺口」全部已修**（本次探针逐条 MATCH）：`type X = { a: number }` 的类型字面量成员、
  `abstract f(): void;` 与接口方法、`static { … }` 块、`Label` 包含所标语句、语句首裸 `[a, b];`、
  `({ a: b })` / 对象字面量在语句首。README 该节已改写。
- cover9 的 **44 条 handoff 候选全部 live green**（probe 88 = 44 条修复前红基线 + 44 条原对照；survey 75 条不在官方
  probe 内，作者用 survey 探针验证，结论已由新增用例体现）。
- cover5–8 的遗留项绝大多数已关闭（清单见 git 历史里的 cover*-FINAL.md）：
  装饰器尾随声明、U+2028/29 ASI、块内 import/export、模板块 `export {}`、`@dec` 接 function/enum、
  顶层 `yield`/`await`、`@dec` 贴变量声明、`global {}` 尾随、匿名 `export default function`、
  `let` ⏎ `let = 1`、`as T` ⏎ `<b>c`、`class extends {}`、`declare class {}` 等。
- 旧文档里的「暂缓」但本次实测已 MATCH：`enum E { [k] = 1 }`、`f<T<U>>(a)`、`class extends (class {})`、
  `let { [k]: a } = o;`、`\u{…}` 标识符、`yield` ⏎ `(x)`、模块顶层 `await`、对象字面量泛型方法、参数装饰器、
  import/export 尾注释 EOF 与无分号 ASI 等。
- 两条原登记 known-gap：`gap-r1231`（块 `}` 后换行 `/`）、`gap-r1237`（类型位「词+`{`」）——**已修**，不再接受为 known-gap。

### 7.5 下一批建议顺序

1. **O5/O6（新语料缺口）**：先由用户裁定这两个形是否入尺子（O6 是 JS 早错误，O5 是合法 ES）；入尺子后按
   oracle 收进 `bindings.ts`/`statements.ts`（应转红），再修绑定元素名与形参默认值路由；同类面（catch 解构/默认值）一起扫。
2. **W1（O1）**：无体签名的 `{…}` 误当函数体——影响面最大，需三分候选；同时复核 O3/O4 的块内声明路径。
3. **W3（O2）**：`module-block-shape` 成员 `declare` 同行判据，与 O4 同族。
4. **H2**：空白判定统一（`IsWhitespaceChar`/`NextChar`/`NextWord` 接共享判据），顺手处理行注释只认 `\n` 的隐患；
   **NEL 不要加进行终止符**。
5. **H1/H3**：`IsAsiBoundary` 的 `<` 守卫与装饰器两路径合并——先补最小语料再动，避免回归。
6. 口径类（`>>`、关键字升级、模板恢复树、正则登记通道）等用户裁定，或按「先补语料、0 红不动」处理。

---

## 8. 复跑手册

### 8.1 构建

```powershell
# 在仓库根；xl 不在 PATH，用会话工具 xl_build：
#   xl_build(cwd="C:\Users\Admin\Documents\GitHub\xl-example", targets=["ts"], paths=["core","typescript"], out="dist")
# 不要省略 paths：根级构建会因 cjcli.xl.md 的 dawn dead import 中止（§1.2）
.\node_modules\.bin\tsc.cmd -p tsconfig.json          # 期望 exit 0、无输出
```

`*.xl.md` 必须 UTF-8 无 BOM + LF；`dist/`、`build/` 是生成物，不提交。

### 8.2 固定门禁（当前期望值）

```powershell
node typescript/cases/ast-json.mjs                 # 6167 case / 47 stem，cj-fail 0；会重写快照！
node typescript/cases/ast-json-diff.mjs            # 6167/6167 一致；0/0/0
node typescript/cases/token-ast.mjs --quiet        # total=1715 ok=1705 ts-invalid=10 crash=0 diff=0
node tests/parse/validate.mjs                      # 1719 条 / 0 不合格
node typescript/cases/real-dts-ast.mjs             # 226/226
node tests/cover9/probe.mjs                        # red=0 green=88；44 条存储基线偏差 → exit 1（预期）
node samples/check.mjs                             # 当前不可运行（需 cjcli，见 §1.2）
```

- `xl_check`：`864 files / 0 error / 2466 warning`；3 个 E2004 孤儿是既有 dist 残留，不是 error。
- **跑 `ast-json.mjs` 会重写被跟踪的快照**：只在独立克隆里全量跑，或先在主仓确认 `git status`；主仓只做只读门禁。

### 8.3 证据与陷阱

- 本轮证据：`tmp/final-gates/`（`ast-json.log` 等各门日志、`summary.txt`、`gap-probe.mjs`/`w-probe.mjs`/`deferred-probe.mjs`
  三个只读探针）；`tmp/final-docs/`（六份蒸馏摘要）。**均未跟踪、不提交**。
- cover9 证据：git 历史里的 `docs/cover9-FINAL.md`（`f7568a95`）与各作者报告；`xl-example-set/_archive/` 有清理清单。
- 常见坑：
  1. **PowerShell 5.1 的 `Get-Content`/`Set-Content` 默认编码会读坏/写坏 UTF-8**（读用 `read` 工具或显式 `-Encoding UTF8`；
     改 `.xl.md` 必须 UTF-8 无 BOM + LF）。
  2. `token-ast`/`ast-json` 读 `build/ts`，**没构建就是旧结果**；判断回归用 `--fail-only` 逐文件对拍，不看总数。
  3. `crash → diff` 是崩溃消掉、口径另修，不算回归；只有原 `ok` 变坏才算。
  4. `ts-invalid` 不是失败；不要为对齐 TS 非法形改 shape。
  5. 快照归一化的大 diff 不是回归（§4.3）；**禁止手工合并 JSON**。
  6. probe 的 exit 1 是 `candidates.json` 红基线所致，**不要更新它**；想让 probe exit 0 应另存新基线。
  7. `unit instanceof Symbol` 必须 import `symbol.xl.md`，漏了会静默全 Reject（被终结候选当 ASI 边界）。
  8. 同一 stem 冲突：两段都留 + 重生成快照，不要手拼。
  9. 历史读数（1703/4622/4497/782 等）不可与当前 1715/6167 混比；每轮先确认 HEAD。

---

## 9. 文档沿革与保留文件

### 9.1 当前 docs/

| 文件 | 状态 |
| --- | --- |
| `docs/Final.md` | **本文件**：当前唯一汇总（状态/规范/覆盖/裁定/缺口/复跑/沿革） |
| `docs/xl-to-cpp.md` | **保留**：C++ 目标生成契约；文首有「修订说明（与实际实现对齐）」，早期两遍构建描述**未被采用**，以文首说明与各节实际实现为准；文中 `dawn/...` 路径为历史示例 |
| `docs/cpp-design-notes.md` | **保留**：C++ 三个结构性决定的论证；文首注明第 2 条（`shared_ptr`）已落实，第 1 条（两遍构建+`CANGJIE_BODIES`）与第 3 条（`TypeName()` 字符串反射）**未采用**，实际方案见 `xl-to-cpp.md` |

### 9.2 本次删除的 48 份文档

过程文档已用 `git rm` 删除（未提交，删除本身可由 git 历史恢复：`git show c70e173d:docs/<文件名>`）。
逐份索引见附录 A。它们的有效结论已分别并入：§2/§3/§4/§5/§6/§7，以及 `tests/cover9/candidates.json`
（cover9 候选库，未删除）与 git 历史里的 cover9 终验/作者报告。

### 9.3 引用位置已同步

- `README.md`：加「当前状态以 docs/Final.md 为准」提示；修正 `ast:cases` 过期读数（4622 → 6167）、
  `real-dts` 历史分析链接（→ `docs/Final.md`）；「解析优先级」「已知缺口」两节改写为当前情况；「cjcli」节加「当前不可用」提示。
- `typescript/cases/real-dts-ast.mjs`：注释里的 `docs/real-dts-ast-analysis.md` → `docs/Final.md`。
- `typescript/run/typescript-template.xl.md`：两处 prose 引用 `docs/cover6-core-string.md` / `docs/cover7-brace-string.md`
  → `docs/Final.md`（prose 不进产物，不涉及重新构建）。
- `.gitattributes`：注释里的 `docs/cover9-endcompute.md` → `docs/Final.md`（规则本身未动）。
- 其它历史引用（如旧 `tests/parse/*` 指向 `docs/ast-json.md`、`docs/member-layer-plan.md`）在本次清理前就已失效，
  属旧分支遗留，不在本文件维护范围。
- `typescript/cases/*.ts` 里还有 **23 处**源码注释用 `docs/<旧名>` 指向被删文档（如 `basic-token.ts`、`bindings.ts`、
  `declarations.ts`、`end-declarations.ts`、`members.ts`、`expression.ts`、`literals.ts`、`module-blocks.ts`、
  `module-declarations.ts`、`labeled-statements.ts`、`statements.ts`、`missing-end.ts`、`dts-types.ts`、`string.ts`）：
  这些只是溯源标注，不影响构建与门禁；为不动含 CR/LS/PS 的 `-text` 夹具文件，本次未逐个改写。
  查旧内容用附录 A 的文件名 + `git show c70e173d:docs/<名>`。

### 9.4 维护规则

- 本文档是 **docs/ 的唯一汇总**：新轮次完成后把结论追加到 §6/§7 并更新 §2 读数，不再新建过程文档；
  过程证据放 git commit、未跟踪的 `tmp/`，需要长期保留的放 `xl-example-set/_archive/`。
- 改 `core/**` 或 `typescript/IMPORTANCE.md` 前先读 IMPORTANCE §1（只允许用户编辑）与 §3（约束）。
- 任何「读数」必须带命令与 HEAD；作者分支局部读数（如 cover9 作者的 stem 数）不能直接引用，只引终验读数。

---

## 附录 A：已删除文档索引（48 份）

> 「并入」列是它们当前有效的去向；「内容」是删前一句话。文件均可从 `git show c70e173d:docs/<名>` 取回。

| 文件 | 内容 | 并入 |
| --- | --- | --- |
| basic-token-scenarios.md | basic token 7 场景（regex/$/\uXXXX/\u{…}/BOM/shebang/`>>`/async）方案与用户裁定 | §4.1/§5 |
| cases-hygiene.md | task-309 用例去重（`f62fca13`，+0/−162，distinct 4087） | §3.4/§6.2 |
| cover5-FINAL.md | 七类问题终验 PASS（5709/5709），core 七项 A–G 交裁定 | §6.1 |
| cover6-FINAL.md | core A–G 终验 PASS（5784），开关默认值表、core 审计 | §5/§6.1 |
| cover7-FINAL.md | 字符串 `\u{…}` 位数终验 PASS（5797） | §4.1/§6.1 |
| cover8-FINAL.md | A–D 四组终验 PASS（5929），ASI/装饰器/块内 import-export | §6.1 |
| cover9-FINAL.md | cover9 独立终验 PASS（6167，probe，55/55，W1–W5，回滚链） | §2/§6/§7 |
| cover9-basictoken.md | X 组：U+0085 NEL 按 TS 词法算空白（core 零改动） | §4.1/§5 |
| cover9-endbuild.md | A01–A16+C01：EOF 尾随分界、装饰器声明头（+39） | §6/§7 |
| cover9-endcompute.md | B2/C 族：type alias `<` 跨行边界、ASI 边界 token 收尾（+23） | §6/§7 |
| cover9-missingend.md | Y01–Y17+O01–O07：匿名无体 export default、声明头分界（+45） | §6/§7.1 |
| cover9-missingpossible.md | A17–A21+C07/C08：装饰变量声明、`global {}` 分派（+22） | §6/§7.1 |
| cover9-possbuild-class.md | O08–O19：块/语句位匿名 `class {}` 恢复 AST（+18） | §5/§6 |
| cover9-posscompute-decl.md | Z17–Z24：enum/interface `declare`、成员 `readonly`/`new` 同行判据（+25） | §6/§7.1 |
| cover9-posscompute-type.md | Z01–Z16：`type` 声明头同行判据（+16） | §6 |
| cover9-possiblebuild.md | B1/B3/C 族：`as` 后行终止符、`as typeof` 后 `<`、yield/await 上下文（+25） | §6 |
| coverage-bindings.md | bindings 家族覆盖与 AST 口径表 | §4.2 |
| coverage-class-members.md | class/interface 成员覆盖（5 chunk：extras/decorators/modifiers） | §4.2 |
| coverage-declarations.md | declarations 家族 chunk 记录（含 generators、乱码恢复补遗） | §4.2 |
| coverage-end.md | end/possible：ASI 四条件、EOF 收口、CanStart `[`、声明条目收口 | §3.3/§4.2 |
| coverage-export-decls.md | export 声明各 chunk（combos、type-star、default generic class） | §4.2 |
| coverage-expression-chains.md | 调用/链式表达式覆盖（短篇） | §4.2 |
| coverage-expressions.md | expressions 各 chunk（箭头/对象成员/as-satisfies/泛型调用） | §4.2 |
| coverage-import.md | import attributes、dynamic import、`import defer`、type-only import-equals | §4.2 |
| coverage-import-meta.md | `import.meta` / `new.target` 落地 | §4.2 |
| coverage-literals.md | 字面量 sweep + `ast-json` 行内 `\n` 反转义修复 | §3.4/§4.3 |
| coverage-members.md | 对象字面量成员（方法/访问器/computed/generator） | §4.2 |
| coverage-module.md | module/export/import-equals，候选挂载时序根因 | §4.2 |
| coverage-module-blocks.md | module/namespace 块 4 chunk；**`ModuleBlockPossibleShape` 保持桩**的裁定 | §4.2/§5 |
| coverage-operators.md | 二元/赋值/一元/可选链覆盖（短篇） | §4.2 |
| coverage-statements.md | statements 家族各 chunk（含 using/labeled/trivia；**文件本身 UTF-8/GBK 混排、已损坏**） | §4.2 |
| coverage-types.md | TypeBuilder 全档类型文法、区间口径 | §3.2/§4.2 |
| end-close-analysis.md | import/export 收口：A（End 被 trivia 撑大）/B（CanEndAt 零调用）/C1/C2 的根因与修法 | §3.3/§4.2 |
| expression-ast-analysis.md | 表达式 AST 36 探针、七类判定、修复次序 | §4.2/§7.3 |
| real-dts-ast-analysis.md | 112 份 `.d.ts` 崩溃的 15 根因与归并、修后 226/226 | §2/§6.2 |
| regex-token-analysis.md | RegexToken D1–D8、起点判据/词法状态机/形状层接入 | §4.1/§5 |
| remaining-gaps-analysis.md | 44 失败→0 的总账（分类/跨组根因/四阶段） | §6.2 |
| remaining-gaps-declarations.md | declarations 19 crash 逐组归因 | §6.2 |
| remaining-gaps-diffs.md | 9 条 AST diff 组（含两条 final known-gap 已修） | §6.2/§7.4 |
| remaining-gaps-statements.md | statements/expressions 9 crash 归因 | §6.2 |
| remaining-gaps-types-modules.md | types/modules 8 crash 归因 | §6.2 |
| string-template-analysis.md | 模板/标签模板/转义改造（三处职责、cooked、默认值） | §4.1/§5 |
| token-ast.md | token 尺子说明书（跑法/四态/归一化副作用；基数为旧值） | §3.4/§4.3 |
| token-ast-analysis.md | 191 处失败七类归因、五问、裁定与修复轨迹 | §3.3/§6.2 |
| token-ast-analysis-declarations.md | declarations 41 份崩溃逐组证据 | §6.2 |
| token-ast-analysis-expressions-types.md | expressions/types 47 份崩溃逐组证据 | §6.2 |
| token-ast-analysis-modules-diffs.md | modules/lexical 17 崩溃 + 29 diff 归因 | §6.2 |
| token-ast-analysis-statements.md | statements/ambiguous 57 份崩溃逐组证据 | §6.2 |

## 附录 B：47 个 stem 的用例数（当前 6167）

```text
angle=19              asi-import-boundary=40   async-arrows=22        async-functions=63
await-expressions=23  basic-token=221          bindings=39            call-forms=25
class-expressions=34  declarations=817         dts-recovery=22        dts-types=103
end=53                end-build=251            end-compute=318        end-declarations=216
end-export-assignment=49  end-import-export=46 export=254             export-functions=49
expr-yield-await-context=8  expression=599     expression-chains=42   gaps-diffs=8
gaps-r1231=3          gaps-scanner=9           gaps-types=6           generator-functions=27
import=91             import-meta=43           labeled-statements=42  literals=120
members=203           missing-end=142          missing-possible=157   module-blocks=214
module-declarations=26 number=63              possible-build=198     possible-compute=205
regex=273             spread-forms=30          statements=412         string=75
type-assertions=28    types=450                using-declarations=29
```

（47 stem 合计 6167；数字来自 `ast-json.mjs` 的逐 stem 汇总。`declarations`/`expression`/`statements`/`types` 是大头。）

---

## 附录 C：本文件事实的来源分层

- **A. 本次实测（2026-10-22，HEAD `c70e173d`）**：§2 全部门禁读数、§4.2 的「已 MATCH/仍 crash」判定、§7.1 的 O1–O4、
  §7.2 的 H2、§7.4 的「已核实关闭」清单（`tmp/final-gates/gap-probe.mjs`、`w-probe.mjs`、`deferred-probe.mjs`）。
- **B. cover9 独立终验（PASS，代码面 `2a531cb2`）**：§2 的 probe/抽样/238 用例、§6 的 cover9 合并与回滚链、
  §5 的裁定记录。
- **C. 逐轮终验与过程文档（已删，git 历史可查）**：§6 的 cover5–8 读数、§6.2 的 round 21–26 归因与语料演进、
  §4.1/§4.2 的机制细节、§7 的 W1–W5 来源（对应 `docs/cover9-FINAL.md` §11 与各作者报告）。
- **D. 规范原文（仍在仓库）**：§3 全部规则来自 `typescript/IMPORTANCE.md`；C++ 部分见两份保留文档。
- 三份探针脚本与门禁日志都在未跟踪的 `tmp/final-gates/`；如需复核，按 §8 命令重跑即可，不依赖被删文档。
