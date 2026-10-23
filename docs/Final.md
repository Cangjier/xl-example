# xl-example Final — TypeScript 前端当前状态

> **定位**：本文档只记录**当前状态**（项目形态、门禁读数、开发规范、语法覆盖、已裁定口径、遗留缺口、复跑方法）。
> 历史过程由 git 历史承载，不在此复述。
>
> **权威源**：`typescript/IMPORTANCE.md`（开发流程与质量规范，只允许用户编辑）、`README.md`（构建/CLI/样本；
> 注意其 dawn 时代章节已过时，见 §1.2）、`tests/MIGRATION.md`（旧测试树来源）。
>
> **核对时点**：2026-10-23（Asia/Shanghai），分支 `feature/quick-parse`，代码面 HEAD `893e567c`
> （`integration-7` 合并后的代码面；docs 提交不改变代码），TypeScript **6.0.3** / Node **v24.21.0**。
> §2 读数均为当日复跑。
> **本轮 SHAPE-CACHE**：`PossibleShapeCache.Share` 数据槽 / interface 成员扫描增量（二次→线性）/
> body guide 推广到 enum 与 class（经验总结见 [`docs/share-cache-and-body-guide.md`](share-cache-and-body-guide.md)）。
>
> **标注**：✅ 已实现/已复现；⭕ 仍开放；❓ 需再验；「口径」= 不是缺陷，只是尺子/约定的边界。

---

## 0. 怎么读

| 你想知道 | 看 |
| --- | --- |
| 现在能不能跑、读数多少 | §2、§7 |
| 解析器按什么规则工作 | §3（权威细节在 `typescript/IMPORTANCE.md`） |
| 支持哪些 TypeScript 语法、哪些还不支持 | §4、附录 A（47 个 stem 的用例数） |
| 哪些行为是已裁定的口径 | §5 |
| 下一批该修什么 | §6 |
| docs/ 现在有哪些文件、怎么维护 | §8 |

---

## 1. 项目与当前仓库形态

### 1.1 是什么

- `*.xl.md` 是**唯一事实来源**，同一份规范可生成多个目标语言；`ts` 由 xl 打印器直出（离线、确定性、字节稳定）。
- 本仓是「用 xl 写的 TypeScript 风格语言前端」：字符流 → basic token → shape/候选树 → **TS 兼容 AST**
  （`typescript/cases/*.ts` 语料逐条与 `ts.createSourceFile` 三栏对拍）与 **XML token 树**
  （`Token.ToXmlString`，标签名取 `this.constructor.name`）。
- 构建链路：`*.xl.md --xl build--> dist/ts/**/*.ts --tsc--> build/ts/**/*.js`。`dist/`、`build/` 均被 `.gitignore` 忽略。

### 1.2 当前仓库形态（与 README 有出入，先读这一节）

- 当前仓库只有 `core/` 与 `typescript/` 前端；`dawn/` 旧语言层、`core/runtime` 与旧重组机制已删除。
- 根入口 `cjcli.xl.md` 仍未更新，`# dependencies` 里 `import "./dawn/text/*.xl.md"` 指向不存在的文件
  → **根级 `xl build` 报 2 条 E1006（`cjcli.xl.md:5/6`），dryRun 实测 0 written / 0 skipped / 0 planned**。
  因此 `dist/ts/cjcli.ts`、`build/ts/cjcli.js` 不存在，`samples/check.mjs`、`bin/cjcli.js` 当前**跑不起来**
  （仓库形态问题，不是解析缺陷）。
- 当前**唯一可复跑口径**是定向构建 `core` + `typescript`（`xl_build(paths=["core","typescript"])` → `tsc`）。
- README 的「解析优先级在哪」「cjcli」「样本验收」三节与 `dawn/**` 一起过时；「已知缺口」一节已按当前实测改写。
  README 顶部已提示「当前状态以 docs/Final.md 为准」。
- `tests/` 整套从另一分支搬来，`tests/parse/*` 是**旧分支的尺子**，本分支不以它为准；本分支权威尺子是
  `typescript/cases/{ast-json,ast-json-diff,token-ast,real-dts-ast}.mjs` 与 `tests/parse/validate.mjs`。

### 1.3 目录地图

| 路径 | 内容 |
| --- | --- |
| `core/` | 语言无关层：`exceptions/`、`extensions/`、`syntax/{basic-tokens,messages,templates}/`、`syntax/*.xl.md`（`catalog-guide`、`process-source`、`token`、`branch-*`、`shape-*`、`possible-shape(-cache)`、`source*`、`syntax-context` 等） |
| `typescript/tokens/` | TS 语法层，按家族分目录：`aliases bindings declarations expressions files jsdoc jsx keywords literals members names punctuation statements synthetic trivia types`（`*.xl.md` 规范，禁止散文） |
| `typescript/ast/`、`typescript/run/` | AST 节点规范；语言模板（`typescript-template`、`typescript-symbol-template`、`regex-template`、`line-terminator` 等）与 `source-file-runner` |
| `typescript/cases/` | 47 个语料 stem + 尺子（`ast-json`、`ast-json-diff`、`ast-compare`、`token-ast`、`real-dts-ast`） |
| `typescript/{exec,runtime,stdlib}/` | 从另一分支继承的执行/运行/标准库相关产物（本前端不依赖其运行） |
| `tests/` | 旧测试树（`MIGRATION.md` 说明来源）；`tests/cover9/` 是候选库与 `probe.mjs` |
| `samples/`、`bin/` | 样本与 `cjcli` 薄包装（当前不可构建，见 §1.2） |
| `docs/` | 本文件 + 两份 C++ 规范（见 §8） |

### 1.4 构建注意

- `xl` 不在 PATH；会话里用 `xl_build` 工具（`cwd`、`paths`、`targets:["ts"]`、`out:"dist"`）。
- `*.xl.md` 必须 **UTF-8 无 BOM + LF**，否则 `xl_build` 报 E0005（PowerShell 5.1 的 `Set-Content -Encoding utf8`
  会写 BOM+CRLF，别用它编辑规范）。
- 不传 `paths` 的根级构建会被 `cjcli.xl.md` 的 dead import 中止（见 §1.2），且不写任何产物。

---

## 2. 当前状态：固定门禁读数

以下为 2026-10-22 复跑读数（代码面 HEAD `2a531cb2`）；**2026-10-23 本轮（代码面 `893e567c`）复跑一致**，逐项读数未变：

| # | 门禁 | 命令 | 实测 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | 语料 AST 生成 | `node typescript/cases/ast-json.mjs` | **6167 case / 47 stem，cj-ok 6167，cj-fail 0** | ✅ |
| 2 | 语料 AST 对拍 | `node typescript/cases/ast-json-diff.mjs` | **6167/6167 完全一致；结构差 0 / 位置差 0 / 字段差 0** | ✅ |
| 3 | token 语料尺子 | `node typescript/cases/token-ast.mjs --quiet` | **total=1715，ok=1705，crash=0，diff=0，ts-invalid=10，gap-now-passing=0** | ✅ |
| 4 | 语料文件体检 | `node tests/parse/validate.mjs` | **1719 条用例，0 条不合格**（exit 0） | ✅ |
| 5 | 真实 `.d.ts` 门禁 | `node typescript/cases/real-dts-ast.mjs` | **226 份：解析成功 226、崩溃 0；AST 完全一致 226、差异 0** | ✅ |
| 6 | 类型检查 | `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | **exit 0**（无输出） | ✅ |
| 7 | 规范结构检查 | `xl_check(cwd=主仓, paths=["core","typescript"], targets=["ts"])` | **864 file(s)，0 error，2466 warning**；3 个 E2004 孤儿（`dist/ts/core/syntax/{add-result,branch-condition-result,branch}.ts`，既有 dist 残留） | ✅（只认 error=0） |
| 8 | 候选探针 | `node tests/cover9/probe.mjs` | **88 候选：red=0 / green=88**（A 45+B 22+C 21）；44 条存储红基线不一致 → **exit 1 为预期** | ✅ |
| 9 | 样本逐字节 | `node samples/check.mjs` | **当前不可运行**：`build/ts/cjcli.js` 不存在（§1.2） | 口径 |

**2026-10-23 本轮复跑一致**：门禁 1/2/3/4/5/6 六项读数逐位相同（6167 / 0-0-0 / 1715-1705-0-0-10 / 1719-0 /
226-226 / tsc 0）；门禁 7（`xl_check`）因本轮新增 9 个 `.xl.md` 与 3 条同名类型 warning（E1107），
报 **873 file(s) / 2450 warning / 0 error**，判定不变（只认 error=0）。

当前状态补充：

- `git diff -- core typescript/IMPORTANCE.md`（相对代码面 HEAD 的前一轮起点）为空：core 与 IMPORTANCE 无改动。
- `tests/cover9/candidates.json` 的 **44 条红基线刻意保留**（probe 的 exit 1 由此而来），**不要更新**。
- `xl_check` 的 2466 warning 属 W3102/W3103 文档类 + 3 个 E2004 孤儿，是基线噪音，不是 error。
- 47 个 stem 的逐 stem 用例数见附录 A；其中 7 个重点 stem：basic-token 221、end-build 251、end-compute 318、
  missing-end 142、missing-possible 157、possible-build 198、possible-compute 205（合计 1492）。

---


> 性能现状（2026-10-23，DTS-PERF 轮）：226 份 `.d.ts` 解析合计约 3.36 s，与输入严格线性（β=1.008），约 70% 的时间花在 core 的「每字符固定税」上（每字符 3.07 次对象分配 + 3.44 次 `UnitToken.Process`）。已有一个「8 份 −26~−30%、token 树与 XML 8/8 等价、0 basic-tokens 改动」的组合原型待合并；路线图与批准边界见 [`docs/dts-optimization.md`](dts-optimization.md)。本节门禁读数不受影响。

## 3. 架构与开发规范

权威原文是 [`typescript/IMPORTANCE.md`](../typescript/IMPORTANCE.md)（只允许用户编辑）；本节是摘要，冲突时以 IMPORTANCE 为准。

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
  `BuildByIndex` 复用同一份（不要用 `ItemUtil.ItemStart` 重算）。微基准（n=4000）：不用 cache 112.73ms、
  用 cache 0.33ms（约 **340 倍**），曲线从二次变平。
- **区间口径**：shape `SourceRange` 是**闭区间**；shape 的 `Pos` 含前导 trivia（= 前一个非 trivia 单元 `End.Index+1`，
  与 TS `pos` 同口径）；AST `Pos/End` 是**左闭右开**；换算只发生在 `ParseFromShape`（`Pos = shape.Pos`、
  `End = SourceRange.End.Index+1`），shape 层不得为迁就 AST 改区间。

### 3.2 分层与开关

- **core 只提供语言无关的开关/钩子，且默认值 = 语言无关的历史行为**；TypeScript/ECMAScript 的语义只在
  `typescript/run/*template*` 里覆写启用。验收要求：改完 core 后 `core` 与 `typescript/IMPORTANCE.md` 零 diff。
- 新增能力走「默认关的开关 + ts 层覆写」，不把语言事实写进 core。
- 语言配置（关键字表、禁用方法名表等）挂在模板上；候选表在 `typescript/tokens/**` 的 `*-possible-shape` /
  `*-shape` 里，按 §3.1 的流程增减。

### 3.3 「七类问题」分类法与五问

任何 shape 层问题先归入七类之一（IMPORTANCE §6）：

| 类别 | 典型症状 / 快速判据 |
| --- | --- |
| basic token 存在问题 | 字符没归成正确 token（关键字/符号/转义/空白归属错）→「缺少标识符」「不支持的表达式起点」；**加 `;` 无效**；只能用户裁定 |
| 缺少 possible | 整类形态没有候选（新语句形状、`@` 起头声明、泛型箭头、块体终结候选、`export as namespace` 兜底等）→ 抛「不支持的表达式起点」/ CatalogGuide 共存 |
| 缺少 end | 能成形但没有收口通道（块体只认 `;`、`import=`/`export=` 只认 `;`）→ **加 `;` 即过** |
| possible compute 不对 | Accept/Reject 时机错（EOF 哨兵、修饰词 vs 名字、关键字升级、`<` 多实参、换行后 `;` 归上一条）→ 去尾随换行即绿 / CatalogGuide 共存抛错 |
| possible build 不对 | 已 Accept 但单元集被切碎或文法缺档（裸 `,` 切声明不看 `<>` 深度、形参模式未路由、类型文法缺口）→ build 期 throw |
| end compute 不对 | 边界判错（ASI 缺换行、行注释分支、`;` 归属、前缀运算符、类型段不认换行）→ **吞下一条**（「没有读完」家族）；加 `;` 即绿 |
| end build 不对 | 收口格对但 End/字段取值错（尾随 trivia 撑大 End、零宽节点落点、`FromUnits` 强制 `;`）→ 多为位置差右端多 N 格 |

**五问模板**（写修复报告/评审时必须回答）：① 正确的应该什么时候 build；② build 时提取哪些信息；
③ 什么时候 close；④ close 时提取哪些信息；⑤ cache 怎么复用。build 只发生在四种格：`;`、闭合 `}`/`)`/`]`/`>`、
**换行 ASI**、**EOF 哨兵**；`SignIn(首单元)`、`SignOut(最后非 trivia 的 End)`、`Pos = Positions[first]`，
**trivia 只进 Pos 不进 End**。

经验判据：token 化通常不是主因，**主因是「在哪一格结束」与「build 拿到的是不是完整单元集」**（end 收口族与
build 提取族占绝大多数）；「加 `;` 即绿 / 去尾随换行即绿」是 end 族与候选族的快速分类器。

### 3.4 用例与尺子规范

- 每个语句形态**先一条 base**（无干扰信息），再叠加 **trivia**（前后空格/注释/词间换行/行尾注释）与
  **重复形**（多个导入项/多条成员/同文件多语句）；一行一个用例。
- oracle 是 `ts.createSourceFile(..., ScriptKind.TS).parseDiagnostics`：**只有 diag=0 才入尺子**；TS 自身非法的形
  只记录行为、不计失败。TS 的「静默恢复」形只有用户裁定后才追（已裁定：匿名 `class {}`；`throw` 换行恢复形也已对齐）。
- 用例**只增不改**（append-only）；快照由 `ast-json.mjs` 生成，**禁止手工拼 JSON**；同 stem 冲突时两段都留再重生成。
- 含 lone CR / U+2028 / U+2029 / NEL 的用例文件用根 `.gitattributes` 的 `-text` 钉死字节
  （现有规则：`basic-token.ts`、`end-compute.ts`、`possible-build.ts`、`possible-compute.ts`、`cover6-*.ts`、`*-cr*.ts` 等），
  写用例时 CR/LS/PS 用行内字面字符（`\n` 仍写转义）。
- `// xl:known-gap` 文件头标记已通过的既知缺口，token-ast 里计入 `gap-now-passing` 而不是 ok。

---

### 3.5 缓存与 body guide（2026-10-23）

本轮把「性能」与「body 括号事件」两件事做成可复制的机制，细节与证据见
[`docs/share-cache-and-body-guide.md`](share-cache-and-body-guide.md)；这里只留**下次动手前必须守的规则**。

**`PossibleShapeCache.Share` 使用规则**（`core/syntax/possible-shape-cache.xl.md`）：

1. `Share` **不受 `Reset` 清空**：寿命 = 持有该 cache 的 `CatalogGuide`（宿主 Shape）的寿命。
   逐条目状态一律放 `Values`（`GetState` / `SetState`），放错就会读到上一条目的残值。
2. **每条 `Share` 数据必须自带 O(1) 新鲜度判据**（引用同一性 / 界内 / 前一位的类别 / 版本号）。
   校验必须 O(1)：用一次全扫来校验等于把省下的时间花回去。
3. **只在 Build 阶段按需写回**：`Compute` / `ComputeByIndex` 不假定 `Share` 里已经有东西；
   `BuildByIndex` / `BuildFromCode` 读、缺了就地建、建完写回（同一份事实源只留一个写回函数）。
4. **`Share` 只允许影响「什么时候建」**：命中与否都必须产出逐节点一致的 AST；宿主 Shape 收尾时
   `ClearShare()` 归还内存。

**增量扫描结论**：interface 单成员长类型的二次项来自四处「每个 token 重算一遍」——`ItemUtil.ItemStart`
倒扫（还被七类候选各调一次 7×O(k)）、`Scan` 重建 `Code`/`CodeAt`、`FindTypeMemberBoundary` 全前缀扫、
`AngleDepth` 全前缀。改成「`Share` 缓存条目起点 + 只追加 + 角深度增量 + 边界增量」后：**N=4000
2012.093 ms → 22.489 ms（≈89.5×，T4 会话约 90–110×），曲线由 ×4 变 ×2，µs/token 恒定 5.6–6.0；
真实 dts 8 份合计 −2.0%（在 ±2.4% 波动内，属「不退化 + 小幅下降」）**。dts 的剩余成本在 core 逐 token
流水线（`UnitToken.Process` 16.6% / `SyntaxContext` 10.8% / `Transit` ≈7.4%），scope 内候选
`MemberBoundary.FindMemberBoundary` 仅 2.6% —— **要做 core 性能另开分支并设端到端 ≥10% 门槛**。

**body guide 现状**：

- **机制**：`BodyGuideUtil`（`typescript/tokens/declarations/body-guide-util.xl.md`）七方法
  `BasePos` / `IsBodyBracket` / `MountBodyGuide` / `MountShell` / `CollectBodyMembers` / `FinishShell` /
  `CreateShapesCache`；前提是**壳在 `{` 出现前挂上**（`Bracket.Transit` 只回调直接父单元）。
- **interface**：已有（范式来源）。
- **enum**：✅ 壳化 + 枚举体成员增量（`EnumDeclarationShape` + `EnumMemberPossibleShape`，一个候选即可）。
- **class**：✅ 壳化 + 类体 **8 类成员**增量（属性 / 方法 / 构造 / get / set / 索引签名 / `static {}` / 孤立 `;`）
  + 装饰器感知（`DecoratorHeadAt`）+ `ClassMemberCatchAllPossibleShape` 兜底
  （`IsBuildable` 恒 `false`，只在「收住且 `Kinds ⊆ ImplementedKinds()`」时让位；**每加一类候选必须同步更新 `ImplementedKinds()`**）。
- **不做**：type literal（`TypeBuilder.ParseTypeLiteral` 在已闭合括号上直建，需另开预扫课题）、
  function / module / object literal / static block / switch / try（理由见新文档 §5.2）。

**已知遗留**：壳化后「未闭合体在 EOF」的恢复形与基线不同（enum / class 各 2–3 条未跟踪形，不影响 7 门禁）；
3 条新增 E1107 同名类型 warning（class 的 get/set/index 候选与 interface 侧同名，0 error，可改名）。

---

## 4. 覆盖清单

完整清单以 `typescript/cases/*.ts` 的 47 个 stem 为准（附录 A）；本节是分类摘要与**真正还没覆盖**的边界。

### 4.1 basic token 层

| 主题 | 状态 | 当前要点 |
| --- | --- | --- |
| 8 种 basic token | ✅ | 见 §3.1；注释/空白为 trivia |
| 正则 `RegexToken` | ✅ | 起点 = `RegexTemplate.CanStartAt` 纯词法判据 + `TypeScriptRegexTemplate.CanStartAt` 位置启发（控制头 `)` 后、裸块 `}` 后、`else`/`do` 尾、箭头体 `}` 后换行等）；`text` 含两端 `/` 与 flags；flags 解析期不校验；`RegexStartAfter` 登记通道**仍在但无写入点** |
| 字符串 / 模板串 | ✅ | 三处职责：`StringTemplate`=语言事实（引号/转义/行终止符/内插开关）、`StringGuide`=认形状、`String.Default`=按字符收（`$` 记 `PendingInterpolation`，见 `{` 才开内插）。`text` 是去定界符的 cooked；词法层把 `${…}` 收成 `String IsSupportInterpolation=True` + `ConstString`/`InterpolationString`；形状层按它切 `NoSubstitutionTemplateLiteral` / `TemplateHead` / `TemplateMiddle` / `TemplateTail` / `TemplateExpression` / `TemplateSpan` / `TaggedTemplateExpression` |
| 字符串转义 | ✅ | `\uXXXX`、`\xNN`、`\u{…}`、代理对、NonEscape、八进制、续行、模板内 CRLF 归一、带标签模板非法转义取原文；`\u{…}` 位数不限、码点 ≤ U+10FFFF（越界以 `MaxUnicodeCodePoint()+1` 标记为非法） |
| 行终止符 | ✅ | 行注释/`String`/Shebang 收尾：`Template.LineTerminatorChars` core 默认 `"\n"`，ts 覆写 `"\n\r\u2028\u2029"`；`StringTemplate.LineTerminatorChars` core 默认 `["\n","\r"]`，ts 加 LS/PS；共享 `typescript/run/line-terminator.xl.md`（CRLF 算一）；`-text` 夹具覆盖 lone CR |
| U+0085 NEL | ✅ | 按 TS 词法算**空白**（`isWhiteSpaceSingleLine` 的 `nextLine`），只改 ts 层 `IsWhiteSpace`，core 零改动；**NEL 不是行终止符**，`isLineBreak` 不含 0x85，不得放进 `LineTerminator` |
| U+FEFF BOM | ✅ | `Bom` basic token；**只允许** index 0 或前面只有 trivia；mid-code BOM 不支持 |
| shebang `#!` | ✅ | `Shebang` basic token；index 0 或 `BOM.End+1`，吞到行终止符前；BOM+shebang 的超集行为被有意接受（TS 报 2 条诊断，不入尺子） |
| `$` 作标识符字符 | ✅ | 从 core 符号表移除（不是 per-language `Ban`） |
| `>>` / `>>>` | 口径 | token 层**不拆**（保持合符号）；类型位置由 `TypeBuilder` 按字符拆成虚拟单 `>`；表达式位是否拆属 basic token 决策，未定（当前 0 红） |
| 上下文关键字升级 | 口径 | `async` 等「什么时候升级成关键字」的归属未统一定论（建议判据留在 parser）；孤立 `declare;`/`abstract;` 是否 token 层不升级未定 |

ts 层对 core 的模板覆写（当前配置）：`Template.LineTerminatorChars`、`StringTemplate.LineTerminatorChars`、
`StringTemplate.StrictTemplateEscapes=true`、`StringTemplate.AllowLongUnicodeBraceEscape=true`、
`SymbolTemplate.SupportUnicodeEscapeIdentifier`、`SymbolTemplate.IsCombineBlocked`（`?.` 后跟数字不合并）、
`RegexTemplate.CanStartAt`。

### 4.2 语法家族

| 家族 | ✅ 已覆盖（摘要） | ⭕ 仍暂缓 / 口径 |
| --- | --- | --- |
| statements | `if/else`（含注释/空体/换行）、`for/foreach/while/do`（含 do 尾分号可省）、`try/catch/finally`、`switch`、`with`、`debugger`、`using`、`return/throw/break/continue`、标号语句、ASI 全组合 | `catch` 绑定默认值 `try {} catch (e = 1) {}`：TS `diag=0` 但本仓 crash（§6.1 O6）；`catch (...e)` 本身 TS 非法（diag=3，口径） |
| declarations | class/interface/function/enum/namespace（`module`）/type alias/import/export/import-equals、修饰词与装饰器、无体签名、abstract 成员、参数装饰器、抽象访问器、`declare`/`global` 增强；`enum E { [k] = 1 }`、`f<T<U>>(a)` 等形态实测 MATCH | 字面量名绑定 `let { "s": a } = o;`：TS `diag=0` 但本仓 crash（§6.1 O5）；`class C<T<U>>` 是 TS 非法（diag=2）；`export abstract ⏎ class`、`export declare ⏎ type/interface` 是 TS 非法形（diag≠0，口径） |
| types | TypeBuilder 全档：引用/泛型、联合/交叉、条件/infer、映射、元组/命名元组、模板字面量类型、类型算子、索引访问、`import()`、`typeof`、谓词、字面量、`this`、括号、rest、函数/构造类型、对象类型成员（属性/方法/调用/构造/索引签名，`readonly`/`new`/可选/同行判据）、JSDoc 后缀 | 无族级暂缓 |
| expressions | 全部一元/二元/赋值/可选链、箭头（含泛型/async）、class 表达式、对象/数组字面量与展开、模板/标签模板、调用/`new`/instantiation（`f<string>` 无调用形）、`as`/`satisfies`/尖括号断言、`yield`/`await` 上下文、`import.meta`/`new.target`、动态 `import()`、`#` brand check；`class extends (class {})` 实测 MATCH | CanStart 放行 `(`/`[`/`<`/`#`/`!~+-`/`++/--`；**`{` 仍不放**（块/对象二义） |
| members / 对象字面量成员 | 方法/访问器/generator/async/computed/optional private、泛型方法、返回类型/谓词 | 无族级暂缓 |
| bindings | 对象/数组解构（含嵌套、rest、默认值、rename、computed name）、形参模式与默认值 | 字面量名绑定见 O5 |
| literals / number / regex 语料 | 数字（进制/分隔符/大整数）、字符串（全部转义）、正则（`regex.ts` **273** 条） | 正则正文里的真 `\n` 写不进语料（`decodeCaseText` 只展开 `\n`，字面量内不展开）；空正则只能 `/(?:)/` |
| import / export / module | import attributes、`import defer`、type-only（含 inline specifier/type-star）、import-equals、`export =`、`export default`、`export as namespace`、namespace/module 块、ambient module、`global {}` 增强、模板块内 import/export、`export import type A = B.C` | `export` 家族「换行后 TS 的 pos≠0」属**尺子口径**问题（不是实现缺口） |
| class/interface members | 字段/方法/访问器/构造器/索引签名/调用与构造签名、修饰词同行判据（`readonly`/`new`/`declare`）、abstract 访问器、static 块（AST 已 MATCH） | 无族级暂缓 |
| end / possible / ASI | 四个专项 stem（`end`、`end-build`、`end-compute`、`missing-end`、`missing-possible`、`possible-build`、`possible-compute`）：ASI 四条件（+ 第 5 条声明起点边界）、EOF 收口与零宽补齐 `;`、装饰器声明头、匿名无体 `export default function`、匿名 `class {}` 恢复、`global {}` 尾随、模板块成员分派 | 见 §6.1（O1–O4 仍开放） |
| 真实 `.d.ts` | **226/226** 解析成功且 AST 逐节点一致（`typescript/lib`、`@types/node`、undici-types）；固定门禁 `npm run ast:dts` | 门禁固定本机这 226 份，更多 `@types` 未纳入 |
| JSX / TSX | ❌ **不支持**（IMPORTANCE §8） | `<div/>` 在 .ts 下本仓 crash，TS 也 diag≠0（口径） |

### 4.3 尺子（harness）

- `ast-json.mjs`：读 `typescript/cases/*.ts`，一行一用例（行内 `\n` 由 `decodeCaseText` 还原成真换行），
  生成/更新 `*.cj-ast.json` / `*.ts-ast.json` 快照；`ast-json-diff.mjs` 逐条与 TS 三栏对拍。
  归一内核只有一份 **`typescript/cases/ast-compare.mjs`**（`TS_KIND_ALIASES`：`FirstStatement→VariableStatement`、
  `FirstNode→QualifiedName`、`FirstTypeNode→TypePredicate`、`LastTypeNode→ImportType`、
  `FirstContextualKeyword→AbstractKeyword`、`AssertClause→ImportAttributes` 等）。
- `token-ast.mjs`：一**文件**一用例（`tests/cases/token/**`，去 BOM、不做行内 `\n` 解码）；四态 `ok/crash/diff/ts-invalid`，
  `crash` 展开 `InnerException` 链（≤12 层）取最内层消息；支持 `--quiet`、`--fail-only`、`--json <path>`、路径/glob 过滤；
  **选中集合内有 crash/diff 才 exit 1**（ts-invalid 不计），可当门禁。当前 total 1715。
- 快照副作用：历史归一化把 26 份 `*.ts-ast.json` 的 **932 行 kind 改成规范名**；再归一幂等、读数不变，
  但重生成会产生大 diff——不是回归。
- 对拍定义只有一处、三处共用；`tests/parse/*` 的旧尺子读另一分支产物，不作为本分支证据。

---

## 5. 关键裁定与口径

| 主题 | 当前裁定 / 口径与落实位置 |
| --- | --- |
| core / basic token 修改权 | `core/syntax/basic-tokens/` **只能由用户发起修改**；AI 只做 ts 层覆写（core 零改动）。IMPORTANCE §3.1 |
| 分层 | core 开关默认 = 语言无关的历史行为；TS/ECMAScript 语义只在 `typescript/run/*template*` 覆写；验收要求 core 与 IMPORTANCE 零 diff（当前为空）。IMPORTANCE §3 |
| U+0085 NEL | 按 TS 词法算空白；**不是行终止符**，禁入 `LineTerminator`。实现：`typescript/run/typescript-symbol-template.xl.md` 的 `IsWhiteSpace` |
| `$` | core 符号表移除 `$`，`$` 可作标识符字符。`core/syntax/basic-tokens/symbol.xl.md` |
| BOM | `Bom` token，仅 index 0 / 前面只有 trivia；mid-code 不支持。`core/syntax/basic-tokens/bom.xl.md` |
| shebang | `Shebang` token，index 0 或 `BOM.End+1`，吞到行终止符前；BOM+shebang 超集有意接受（TS 报 2 条诊断，不入尺子）。`core/syntax/basic-tokens/shebang.xl.md` |
| 正则起点 | `RegexTemplate.CanStartAt` 纯词法 + `TypeScriptRegexTemplate.CanStartAt` 位置启发；`RegexStartAfter` 登记通道保留但无写入点。`core/syntax/templates/regex-template.xl.md`、`typescript/run/typescript-template.xl.md` |
| Unicode 上限 | 唯一常量 `Common.MaxUnicodeCodePoint()`=U+10FFFF；位数不限、越界以 `Max+1` 标记非法；`\u{…}` 在标识符与字符串两条路径均已实现 |
| 字符串 cooked | 模板/标签模板/普通引号串按「超集」口径取原文（非法转义 `\8`/`\9` 取原文）；core 默认历史行为，ts 覆写。`core/syntax/templates/string-template.xl.md`、`typescript/run/typescript-template.xl.md` |
| 匿名 class 恢复 | 块体/语句位 `class {}` 建无名字 `ClassDeclaration`（追 TS 静默恢复 AST）；更松恢复形不追 |
| TS 非法形 | `parseDiagnostics≠0` 只记录行为、不入尺子、不为对齐改 shape。token 语料固定 10 份 ts-invalid，明确不修 |
| TS 恢复形 | 只有用户裁定才追；已追：匿名 `class {}`、`throw` 换行零宽 `Identifier` |
| 用例策略 | append-only；先 base 再 trivia/重复形；快照只由 `ast-json.mjs` 生成，禁手工 JSON。IMPORTANCE §5 |
| 字节级夹具 | 含 lone CR/LS/PS/NEL 的 case 文件用 `.gitattributes -text` 钉死；写行内字面字符。`.gitattributes` |
| probe 基线 | `tests/cover9/candidates.json` 的 44 条红基线**刻意保留**，probe 因此 exit 1（预期）；不要更新。`tests/cover9/candidates.json` |
| `xl_check` | 只认 `error=0`；2466 warning（W3102/W3103 文档类）+ 3 个 E2004 孤儿是基线噪音，计数随文件数漂移 |
| `tests/gates` | 旧分支的尺子/环境门，不作为本分支验收。`tests/MIGRATION.md` |
| 文档 | 本文件是 docs/ 唯一汇总；改动追加到对应节，不再新开过程文档；过程证据放 git commit / 未跟踪的 `tmp/` |

---

## 6. 遗留缺口与下一批候选

> 判定基准：代码面 `2a531cb2`。§6.1 的「⭕ 仍开放」均已用最小探针复现；§6.3 的「口径」不是缺陷，但决定下一批做什么。

### 6.1 已复现的开放缺口（建议下一批）

| # | 现象 | 最小证据（实测） | 影响 / 修法方向 |
| --- | --- | --- | --- |
| O1 | **无体签名把后续语句吞成函数体** | `export default function (): void` ⏎ `z = {};`：TS 为 `VoidKeyword` + `ExpressionStatement`+对象字面量；本仓多出 `Block`（把 `z = {};` 当函数体）；`foo({});` 变体丢 `ExpressionStatement` | end build / missing-end：候选需按「参数表 / 返回类型 / 下一语句起点」三分；落点 `typescript/tokens/files/source-file-end-possible-shape.xl.md`、`typescript/tokens/declarations/function-declaration-possible-shape.xl.md` |
| O2 | **模板块成员 `declare` 换行** | `declare module 'm' { declare` ⏎ `enum E { A } }`：diff `DeclareKeyword+1 / ExpressionStatement−1 / Identifier−1`（TS 把 `declare` 当前置修饰词） | 需动 `module-block-shape` 的成员分派；落点 `typescript/tokens/declarations/module-block-shape.xl.md` |
| O3 | **装饰器 + `export` 声明仍崩** | `@dec` ⏎ `export enum E { A }` → crash「throw by line 0」；`@dec` ⏎ `export function f(): void;` → crash「函数声明缺少 function 关键字」；`@dec` ⏎ `export type T = 1;` 已 MATCH | 两条装饰器路径（`StatementScanner.IsDecoratedDeclarationStart` 与 `statement-builder.ScanDecoratedHead`）仍两份；落点 `typescript/tokens/statements/statement-scanner.xl.md`、`typescript/tokens/statements/statement-builder.xl.md` |
| O4 | **块内声明 + `global {}`** | `{ declare function gf(): void` ⏎ `global {} }`：diff 缺 `ModuleDeclaration`/`ModuleBlock` | 块级 `BuildFunctionDeclaration` 按 `IsBodyBrace` 找体；`typescript/tokens/statements/statement-builder.xl.md`、`source-file-end-possible-shape.xl.md` |
| O5 | **字面量名绑定** | `let { "s": a } = o;`：TS `diag=0`，本仓 **crash「绑定元素缺少名字」** | bindings 的绑定元素名只认标识符/计算名；`typescript/tokens/bindings/**` |
| O6 | **catch 绑定默认值** | `try {} catch (e = 1) {}`：TS `diag=0`，本仓 **crash**（外层消息 `throw by line 0`，需展开内层异常） | 属 end build/possible build 的形参模式路由。按 oracle 是真红；但该写法是 JS 早错误，**入尺子前需用户裁定**（若排除则只记录行为） |

### 6.2 代码级隐患（登记，当前未复现为失败）

| # | 项 | 现状 |
| --- | --- | --- |
| H1 | `IsAsiBoundary` 的 `<` 判边界依赖调用方换行守卫；EOF 让位分支带 `ItemStart > 0` 前提 | 当前测 `let a = 1` ⏎ `let b = 2` 与 `type T = A` ⏎ `b < c;` 均 MATCH，说明该形态未触发；保留为隐患（`statement-scanner.xl.md` / `statement-possible-shape.xl.md`） |
| H2 | **手写空白表未统一** | `typescript/tokens/expressions/expression-builder.xl.md:964-968` 的 `IsWhitespaceChar` 与 `typescript/tokens/statements/statement-scanner.xl.md:1091/1133` 的 `NextChar`/`NextWord` 仍是手写 `" \t\r\n\v\f"`，未接共享 `IsWhiteSpace`/`LineTerminator`；`NextChar` 跳过 `//` 时只认 `\n`（LS/PS/CR 行注释有风险，未实测）。**NEL 不得作为行终止符加入** |
| H3 | 装饰器两条路径的一致性 | 见 O3；`@dec` ⏎ `export enum/function/type` 退表达式兜底 |

### 6.3 口径性开放（不是「缺陷」，但决定下一批做什么）

- **TS 非法形不测**：`export type` ⏎ `T = 1`（TS diag=1，本仓 crash）、`export declare` ⏎ `function`（TS diag=1，本仓能 parse）、
  `export abstract` ⏎ `class` 等；行为差异只记录，不为对齐改 shape。
- **更松的静默恢复形**：只追了匿名 `class {}` 与 `throw` 换行；`class extends {}`、`declare class {}`、
  `class extends (class {})` 实测 MATCH；更松的 TS 恢复形未系统追。
- **mid-code BOM** 不支持（仅 index 0 / 前面只有 trivia）；BOM+shebang 超集有意接受。
- **`>>` / `>>>`**：token 层不拆；类型位由 `TypeBuilder` 虚拟拆；表达式位 `f<T<U>>(a)` 实测 MATCH，
  但「token 层是否拆」留给用户（basic token 权限），当前 0 红。
- **上下文关键字升级归属 / 孤立 `declare|abstract` 归层**：未定论，建议判据留在 parser。
- **字符串模板恢复树**：未闭合串/空内插的合成节点（空 `LastTemplateToken`/空 `Identifier`）、无诊断通道（只对齐 `text`）、
  C# `{{` 未对拍、raw/verbatim 在 EOF 的向导未决、模板 `raw` 原文不在 `Data`（AST 只比 `text`）。
- **正则机制**：`RegexStartAfter` 通道无写入点（实际走位置启发）；空正则只能 `/(?:)/`；正则正文的真 `\n`
  进不了语料（`decodeCaseText` 只展开 `\n`）。
- **语句层 `yield`/`await` ASI** 与**模块顶层 `await`**：`yield` ⏎ `(x)`、顶层 `await f()` 均 MATCH；
  受限产生式的更细组合仍需补语料。
- **CRLF 不可进 case**：行内 CR 可以（靠 `-text`），CRLF 会被解码/归一破坏；尺子限制，不是解析限制。
- **`\u{…}` 花括号转义标识符**：`const \u{61} = 1;`、`const \u{0000061} = 1;` 均 MATCH（已实现）。
- **ast:dts 语料固定**：门禁固定本机 226 份 `.d.ts`，更多 `@types`/别的 TS 版本未纳入；`typescript.js` 打包文件
  （JavaScript 而非声明）不在门内。
- **JSX/TSX**：永久不支持（IMPORTANCE §8）。

### 6.4 下一批建议顺序

1. **O5/O6**：先由用户裁定这两个形是否入尺子（O6 是 JS 早错误，O5 是合法 ES）；入尺子后按 oracle 收进
   `bindings.ts`/`statements.ts`（应转红），再修绑定元素名与形参默认值路由；同类面（catch 解构/默认值）一起扫。
2. **O1**：无体签名的 `{…}` 误当函数体——影响面最大，需三分候选；同时复核 O3/O4 的块内声明路径。
3. **O2**：`module-block-shape` 成员 `declare` 同行判据，与 O4 同族。
4. **H2**：空白判定统一（`IsWhitespaceChar`/`NextChar`/`NextWord` 接共享判据），顺手处理行注释只认 `\n` 的隐患；
   NEL 不要加入行终止符。
5. **H1/H3**：`IsAsiBoundary` 的 `<` 守卫与装饰器两路径合并——先补最小语料再动，避免回归。
6. 口径类（`>>`、关键字升级、模板恢复树、正则登记通道）等用户裁定，或按「先补语料、0 红不动」处理。

---

## 7. 复跑手册

### 7.1 构建

```powershell
# 在仓库根；xl 不在 PATH，用会话工具 xl_build：
#   xl_build(cwd="C:\Users\Admin\Documents\GitHub\xl-example", targets=["ts"], paths=["core","typescript"], out="dist")
# 不要省略 paths：根级构建会因 cjcli.xl.md 的 dawn dead import 中止（§1.2）
.\node_modules\.bin\tsc.cmd -p tsconfig.json          # 期望 exit 0、无输出
```

`*.xl.md` 必须 UTF-8 无 BOM + LF；`dist/`、`build/` 是生成物，不提交。

### 7.2 固定门禁（当前期望值）

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
- **跑 `ast-json.mjs` 会重写被跟踪的快照**：只在独立克隆里全量跑，或先确认 `git status`；主仓只做只读门禁。

### 7.3 陷阱

1. **PowerShell 5.1 的 `Get-Content`/`Set-Content` 默认编码会读坏/写坏 UTF-8**（读用 `read` 工具或显式 `-Encoding UTF8`；
   改 `.xl.md` 必须 UTF-8 无 BOM + LF）。
2. `token-ast`/`ast-json` 读 `build/ts`，**没构建就是旧结果**；判断回归用 `--fail-only` 逐文件对拍，不看总数。
3. `crash → diff` 是崩溃消掉、口径另修，不算回归；只有原 `ok` 变坏才算。
4. `ts-invalid` 不是失败；不要为对齐 TS 非法形改 shape。
5. 快照归一化的大 diff 不是回归（§4.3）；**禁止手工合并 JSON**。
6. probe 的 exit 1 是 `candidates.json` 红基线所致，**不要更新它**；想让 probe exit 0 应另存新基线。
7. `unit instanceof Symbol` 必须 import `symbol.xl.md`，漏了会静默全 Reject（被终结候选当 ASI 边界）。
8. 同一 stem 冲突：两段都留 + 重生成快照，不要手拼。
9. 引用读数前先确认 HEAD 与构建产物：`build/ts` 与 `dist/ts` 是生成物，可能滞后于规范。

---

## 8. 当前 docs/ 构成与维护

| 文件 | 内容 |
| --- | --- |
| `docs/Final.md` | **本文件**：当前状态的唯一汇总（形态/读数/规范/覆盖/口径/缺口/复跑） |
| `docs/share-cache-and-body-guide.md` | SHAPE-CACHE 轮经验总结 / 推广手册：`Share` 数据槽与纪律、interface 成员扫描二次→线性（前后数字）、body guide 推广到 enum / class、推广到其它 shape 的 checklist 与明确不做的清单、性能调查结论、风险与复跑口径 |
| `docs/xl-to-cpp.md` | C++ 目标生成契约；文首有「修订说明（与实际实现对齐）」，早期两遍构建描述**未采用**，以文首说明与各节实际实现为准；文中 `dawn/...` 路径为历史示例 |
| `docs/cpp-design-notes.md` | C++ 三个结构性决定的论证；文首注明第 2 条（`shared_ptr`）已落实，第 1 条（两遍构建+`CANGJIE_BODIES`）与第 3 条（`TypeName()` 字符串反射）**未采用**，实际方案见 `xl-to-cpp.md` |
| `docs/dts-optimization.md` | DTS 性能优化总报告（DTS-PERF 定稿）：画像证据、15 条决策表、A/B/C 原型实测（8 份 −26~−30%，token 树与 XML 8/8 等价、0 basic-tokens 变更）与分阶段路线图；core / basic-tokens 改动需用户批准 |

维护规则：

- 本文件是 **docs/ 的唯一汇总**：新结论追加到对应节，不再新建过程文档；过程证据放 git commit 或未跟踪的 `tmp/`。
- 改 `core/**` 或 `typescript/IMPORTANCE.md` 前先读 IMPORTANCE §1（只允许用户编辑）与 §3（约束）。
- **读数必须带命令与 HEAD**；不同时点/不同构建的读数不可混比。
- `typescript/cases/*.ts` 里仍有 23 处源码注释引用旧 docs 文件名：只是溯源标注，不影响构建与门禁；
  这些文件多为 `-text` 字节级夹具，未改动；需要旧内容用 git 历史查。

---


## 附录 A：47 个 stem 的用例数（当前 6167）

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

（47 stem 合计 6167，来自 `ast-json.mjs` 的逐 stem 汇总。）
