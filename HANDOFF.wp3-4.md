# HANDOFF — impl-wp3-4（WP-3 第四波：A / B / D 落地，C 未接线）

STATUS: PARTIAL
BRANCH: impl-wp3-4 @ 21e44f22
BASE: impl-wp3-3 @ 36c0aa68

## 做了什么

1. **A（已完成并提交）**：`typescript/tokens/items/source-file-tail-builder.xl.md` 末尾新增三个 build-only 静态入口
   （只加方法，**不改任何调用点**，旧三入口签名与行为一字不动）：
   - `BuildTrailingItems(host,start,at,context):Array<Token>`（journal：`host.Data.slice()` 快照 → 跑 `BuildTrailingDeclaration` →
     按 `delta` 取 `[start..at+delta]` → `host.Data = before` 还原）
   - `BuildSegmentItems(...):Array<Token>`（同形，包 `BuildStatementSegments`）
   - `BuildModuleItem(...):Token | null`（包 `BuildModuleDeclaration`，journal + null 判定）
2. **B（已完成并提交）**：新建 `typescript/tokens/items/root-item-rule.xl.md`：
   - `RootItemRule implements ItemRule`：`Classify` 恒认领 `[1]`；`Analyze` = 不带 context 的 13 候选竞争循环
     （水位线 + `Alive` 淘汰 + `IsBuildable` 收口，`End = state.CodeAt[at]` 是宿主下标）；
     `Build` 按 `KindOf` 走 §1.2 的 **`FromUnits` 直接入口**（绝不 `BuildByIndex`，避开 class/interface/enum 的 `MountShell`），
     建造器抛错 → `null` 走 raw，**绝不改 `host.Data`**；`BuildModule` 复用 A 的 `BuildModuleItem`。
   - `SourceFileBodyItemHost implements IBatchHost`：照抄 `StatementBodyItemHost`，多两处：
     `OnBasicTokens` 每批把 `context` 注入 `RootItemRule.Context`（`Analyze` 没有 context 形参，这是唯一偏离模板的地方）；
     新增 `RawRange()` 供容器读 raw 区间。
3. **D**：ATTEMPTED-BUT-REVERTED（--family root 失败，见下方读数；改动已丢弃，工作树干净）
4. **C 未做**（Adapter 仍是 `null`）：见「未完成项」。因此 **AST 与产物逐字节不变**，
   `full -BaseBuild` 的 buffer-equivalence 与 class-scaling 双 build 等价都 PASS 就是证据。

## 门禁读数（本分支实测，21e44f22）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build（增量） | `xl_build(paths=["typescript/tokens/items"])` | 2 written / **0 error** / 2 warning（既有 W3102/W3103） | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS 5.5s（tsc 3.87 / ast 子集 1214/1214 / diff 0-0-0 / body-guide interface 全通过） | 绿 |
| AST 全量 | `ast-json.mjs` → `ast-json-diff.mjs` | **6167/6167（47 构造）**，结构 0 / 位置 0 / 字段 0 | 绿 |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | 226 文件：解析成功 226、崩溃 0、AST 一致 226 | 绿 |
| full -BaseBuild | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **PASS 38.7s**；buffer-equivalence xml PASS 4504 / FAIL 0 / 同错 52；class-scaling --base 等价 21 项 | 绿 |
| gates/run.mjs | 内嵌于 full | RED* 1/8（基线已知红，见 TEAM §5.4） | 已知红 |
| parse-perf | `parse-perf --dts 8 --repeat 3` | TOTAL median 577.476 ms（并发环境，仅参考） | 参考 |
| xl_check | `xl_check(paths=["typescript/tokens/items"])` | **0 error / 2 warning** | 绿 |
| batch-split root | `node .\tests\body-drive\batch-split.mjs --family root` | == family root: 1 段代码 == /   代码段: 1（建出 item 1 / 全 raw 0） /   RESULT: FAIL  （1 段代码 / 14 次断言 / 1 次失败） / FAIL 建出 item 的段太少（1/1）：引擎没真正跑起来 | 红（已丢弃改动） |

## 未完成项

1. **C：接线 `SourceFileShape` —— 未做**（`BatchAdapter` 仍为 `null`）。
   轮次预算用尽（type 修正 + CRLF 返工各吃掉一轮）。规格 §4.1/§4.2 已完整给出代码，可直接照抄：
   - 加 `FinishBody(context)`（`FlushBatch` → 读 `RawRange()` → `SourceFileTailBuilder.BuildTrailingItems(this, from, to, context)`
     → `this.Data.splice(from, to-from+1, ...replaced)` → `last.TryToClose` → 未 SignOut 时 `SignOut` → `this.TryToClose`）；
   - 构造器 `this.HostAdapter = new SourceFileBodyItemHost(this, SourceFileBodyItemHost.CreateRules(SourceFileShape.CreatePossibleShapes())); this.BatchAdapter = this.HostAdapter;`
   - `Process` 的 EOF 分支用 `FinishBody(context)` 取代「造 `EndOfFileTokenShape` + `eof.TryToClose`」；
   - 接上后立刻跑 AST 全量，**红就 `git checkout -- typescript/tokens/files/source-file-shape.xl.md` 摘回**。
2. root family 的语料覆盖还可以更宽（目前 14 段：import×2 / export×2 / class / interface / function / enum /
   namespace / type / let / 裸块 / if / 无分号 ASI 尾巴）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-5 -From impl-wp3-4 -Base impl-wp3-4
cd impl-wp3-5
# xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")   # 新 clone 没有 dist/build
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
# 1) C：改 typescript\tokens\files\source-file-shape.xl.md（FinishBody + 构造器接线 + EOF 分支）
#    xl_build(paths=["typescript/tokens/items","typescript/tokens/files"])
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript\cases
# 红 → git checkout -- typescript\tokens\files\source-file-shape.xl.md，绿 → commit
```

## 阻塞点

无外部阻塞。未改 `core/**`、`statements/**`、`declarations/**`、`members/**`、`typescript/run/**`、`TEAM.md`、`tools/**`；
没有 merge、没有 push。

## 踩过的坑（省下一轮的东西）

1. **代码块里不能写 `int` / `bool`**：`## method` 签名用 xl 的 `int`/`bool`（会翻译成 `number`/`boolean`），
   但 ```ts 代码块里的类型注解是**原样输出**的 TS——写成 `const n:int = 0` 会得到 `TS2304: Cannot find name 'int'`。
   代码块里一律 `number` / `boolean` / `string`。
2. **`.xl.md` 必须是 LF**：用 `[IO.File]::WriteAllLines` 写回会变 CRLF，`xl_build` 直接
   `E0005: source file contains a carriage return`。写回一律：
   `$t = $t.Replace("`r`n","`n"); [IO.File]::WriteAllText($p,$t,[Text.UTF8Encoding]::new($false))`。
3. **增量构建只要一条路径**：`xl_build(paths=["typescript/tokens/items"])` 只重写这几个文件，
   输出 6 行而不是 370KB——全量构建会把上下文一次吃掉。
4. **`batch-split.mjs` 的参数是空格分隔**：`--family root`（`--family=root` 会报「未知参数」）。
5. `ast-json.mjs` 会重写 `typescript/cases` 快照：每次跑完 `git checkout -- typescript/cases`。
6. `SourceFileRunner.Parse(text, path)` 返回 `SourceFileShape`，`.Data` 就是根的非 trivia 单元数组——D 的语料捕获靠它。