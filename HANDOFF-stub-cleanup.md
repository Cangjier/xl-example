# HANDOFF — 清理未实现 PossibleShape 死桩

分支 `feature/possible-statement-cleanup-stubs`，起点 `857b82dd`，本次提交 `b5fe5a34`。
共享任务 `task-55`。所有读数均为本机实跑，命令见 §8。

## 1. 结论（先行）

- **352 个纯未实现 `PossibleShape` 桩已全部删除**（`# class X extends PossibleShape` 且方法体只 `throw new Error("…未实现")`），**0 个因真实使用而保留**。
- **1 个文件被编辑**（`typescript/tokens/files/source-file-shape.xl.md`，−30 行），删掉 15 条 `import` 与 15 条注释注册行；**仓库内 0 条 dangling import**（相对导入全部解析成功，`grep` 复核见 §9）。
- **构建从零可过**：删 `dist/`、`build/` 后 `xl_build` = 540 written / **0 error** / 1463 warning（基线 892 / 0 / 2520，差 352 个文件正是删掉的桩），**无 E2004 孤儿**；`tsc -p tsconfig.json` exit 0。
- **要求核对的 13 道门全绿、零回归**（§8）；额外跑的 `control-flow-takeover` 是**基线自带的 1 条红**，已在 `857b82dd` 的独立 worktree 上复现（同一 case、同一读数），与本次删除无关。
- 全仓（`typescript/ core/ tests/`，排 `dist build tmp`）「未实现」残余 **29 行 / 15 个文件**，**没有一处是 PossibleShape 桩**（§9）。

## 2. 复核方法与候选集合（独立复核 Lead 结论）

自写脚本 `tmp/recheck.mjs`（非 Lead 的 `stub-inventory.mjs`，可对照）：

1. 候选判据三条同时成立：文件含「未实现」、含 `^# class X extends PossibleShape`、**纯度检查**——每个 `## method` 的 ```ts 代码块里非空行全部匹配 `^throw new Error\("[^"]*未实现"\);$`，且至少有一个方法。
   - 结果：**352 / 352 全部为纯桩，0 个"半实现"**。
2. 引用扫描：对每个候选，用 **文件 basename**（如 `break-statement-possible-shape`）与 **类名 `\bX\b`** 两种模式扫 `typescript/ core/ tests/ samples/`（`.xl.md .md .mjs .cjs .js .ts .json .txt`，排 `dist build build-* node_modules tmp .git`），并**解析每条 import 的目标路径**判断它指向哪个文件。
3. 分类结果（352）：**335 无任何引用**、**1 仅注释提及**（`typescript/cases/module-blocks.ts:30`，见 §6）、**16 有 import/同名字面**，其中 15 条是 `source-file-shape.xl.md` 的 `import`、1 条是 §6 的假阳性。

lead 的侦察方向全部复核成立；**Lead 报的 24 条 import 实际是 15 条**（其余是同名类与 docs 行），以本文件的 15 为准。

## 3. 删除数量与分布（352）

| 目录 | 数量 |
| --- | ---: |
| `typescript/tokens/keywords` | 83 |
| `typescript/tokens/punctuation` | 61 |
| `typescript/tokens/jsdoc` | 43 |
| `typescript/tokens/aliases` | 32 |
| `typescript/tokens/expressions` | 31 |
| `typescript/tokens/types` | 29 |
| `typescript/tokens/statements` | 15 |
| `typescript/tokens/jsx` | 12 |
| `typescript/tokens/literals` | 9 |
| `typescript/tokens/members` | 9 |
| `typescript/tokens/trivia` | 9 |
| `typescript/tokens/declarations` | 8 |
| `typescript/tokens/synthetic` | 7 |
| `typescript/tokens/files` | 2 |
| `typescript/tokens/names` | 2 |
| **合计** | **352** |

每个文件 25 行（`# dependencies` 6 条 import + 空行 + `# namespace cangjie` + 类声明 + 2 个方法各 1 个 throw 块），删除行数 352×25 = 8800。
清单留档：`tmp/deleted.json`（本机，`tmp/` 被 gitignore），可由 `git show --stat b5fe5a34` 复核。

## 4. 编辑的文件与行数

`typescript/tokens/files/source-file-shape.xl.md`：**268 → 238 行（−30）**，内容只有两类删除：

- **15 条 import**（都在 `# dependencies` 段内，随段一起消失）：
  `Break / Continue / Debugger / Do / Empty / ForIn / ForOf / For / If / Labeled / Return / Switch / Try / While / With`（各带 `StatementPossibleShape` 后缀）。`StatementPossibleShape`、`BlockPossibleShape`、`SourceFileEndPossibleShape` 等**已实现**的 import 一个没动。
- **15 条注释注册行**（`CreatePossibleShapes()` 里 `// new XxxStatementPossibleShape(),`；这些类**本来就一条都没被注册**，所以删除不改变行为）：
  `Empty / If / Do / While / For / ForIn / ForOf / Continue / Break / Return / With / Switch / Labeled / Try / Debugger`。
- **保留**同一函数里其余注释行（`// new ImportEqualsDeclarationPossibleShape(),` 等 11 条）：它们指的类**已实现且仍在别处实例化**（如 `ImportEqualsDeclarationPossibleShape` 在 :215、`ClassDeclarationPossibleShape` 在 :216），删了就变成"注释与代码不符"。
- 文件编码核对：**UTF-8 无 BOM、LF**（`bom=false crlf=false`，13622 字节）。

## 5. 保留清单与理由

| 文件 | 理由 |
| --- | --- |
| `typescript/ast/declarations/import-declaration-ast-node.xl.md` | **真实类**（非桩，1 个方法 `ParseFromShape` 未实现，`# class ImportDeclarationAstNode extends AstNode`）。全仓唯一"含未实现但不是 PossibleShape 桩"的 typescript 文件。 |
| `typescript/tokens/statements/statement-operator-body.xl.md`、`statement-shape.xl.md` | 只在**正文散文**里出现「未实现构造」这个术语，不是桩，无 `throw new Error`。 |
| `core/syntax/block-token.xl.md`、`core/syntax/document.xl.md` | `throw new Error("抽象成员未实现")` 是**抽象成员**的兜底（`GetLine` / `Default` 等），不是 PossibleShape；且 `core/**` 本次不动。 |
| `typescript/cases/module-blocks.ts:30` | 一行散文注释「M7 暂缓：module-block-possible-shape…」。**不改 `tests/`、`typescript/cases` 语义**；删了它是文案决定，不是引用清理，故保留并在此报告。 |

**没有"因真实使用而保留"的类**（Lead 的 3 条 real-use 全部复核为假阳性，见 §6）。

## 6. 假阳性证据（逐条核过，均可删）

1. **`members/import-attributes-possible-shape.xl.md` vs `declarations/import-attributes-possible-shape.xl.md`**：类名同为 `ImportAttributesPossibleShape`，但 **declarations 版是真实实现**（3735 字节，`未实现=false`，含 `ComputeByIndex` / `BuildByIndex` 实体逻辑），**members 版是 904 字节纯桩**。唯一的 2 条引用
   `export-declaration-shape.xl.md:14`、`import-declaration-shape.xl.md:21` 都是
   `from "./import-attributes-possible-shape.xl.md"`，**相对 `declarations/` 解析 → 指向 declarations 版**（脚本已按路径解析确认）。故 **members 桩可删，两条 import 必须保留**（保留后仍解析到存活的 declarations 版，0 dangling）。
2. **`debugger-statement-possible-shape`**：`tests/statement-possible/HANDOFF.md:119` 仅散文提及（该文件由另一分支删除），无 import、无 `new`。
3. **`if-statement-possible-shape`**：只出现在 `tests/statement-possible/cases.json:144` 的 `"needs": ["root:IfStatementPossibleShape"]` 与 `harness.mjs:45` 的字符串表 —— **都是字符串元数据**，不是 import/实例化。按指令**保留不动**；删掉类之后这两处仍是同一条"该 stage 未注册因而 skip"的说明，语义不变（harness `--all` 仍 pass=102 fail=0 known=0，stage4/5 两组照旧 skip）。

## 7. 孤儿处理

`xl_build`（paths `core`,`typescript`；targets `ts`；cwd 为本目录）**0 error、无 E2004**，`xl_orphans` 无需调用：
- 删 `dist/`+`build/` 后从零生成 **540 个 .ts**；基线同参数为 **892 个**，差值 **352** 与删除数逐一对上（说明没有任何残留产物指向已删文件）。
- warning 2520 → 1463（掉的 1057 条全是桩文件自己的 `W3103 # namespace has no description` / `W3102 member … has no description`）。
- `tsc -p tsconfig.json` **exit 0**，`build/ts` 生成。

## 8. 全门读数（逐项实跑，本机）

| 门 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| ast-json | `node typescript/cases/ast-json.mjs` | cases=6171 **cj-ok=6171** cj-fail=0（47 构造） | 绿 |
| ast-json diff | `node typescript/cases/ast-json-diff.mjs` | 6171 条：完全一致 **6171/6171**；结构差 **0**／位置差 **0**／字段差 **0** | 绿 |
| cases 目录洁净 | `git status --porcelain -- typescript/cases` | 空 | 绿 |
| token-ast | `node typescript/cases/token-ast.mjs` | total=1716 **ok=1706** crash=0 diff=0 ts-invalid=10 known-gap=0 | 绿 |
| real-dts | `node typescript/cases/real-dts-ast.mjs` | 文件 226、解析成功 **226**、崩溃 0、AST 一致 **226**、差异 0 | 绿 |
| harness --all | `node tests/statement-possible/harness.mjs --all` | groups run=8 skipped=3｜cases **pass=102 fail=0 skip=0 known=0** uncovered=0；file-fallback=0 | 绿 |
| double-accept | `node tests/statement-possible/harness.mjs --double-accept` | **cases=120 failed=0**，互斥冲突 0 | 绿 |
| takeover | `node tests/statement-possible/declaration-statement-takeover.mjs` | **cases=33 pass=33** failed=0 knownGap=0 takeover=27 totalShell=33 | 绿 |
| validate | `node tests/parse/validate.mjs` | **1720 条用例，0 条不合格** | 绿 |
| final-matrix | `node tests/statement-possible/final-matrix.mjs` | cases=38 **shapeAst=38/38 xmlEqLegacy=38/38 astEqTS=38/38** failed=0（knownGap=1，基线同） | 绿 |
| op-ast | `node tests/statement-possible/op-ast-proof.mjs` | **cases=94 pass=94** fail=0 | 绿 |
| ast-kind-names | `node tests/statement-possible/ast-kind-names.mjs` | **PASS**，fixtures=47、operator-nodes=262、fail=0、别名残留 0 | 绿 |
| legacy-retirement | `node tests/statement-possible/legacy-retirement.mjs` | **PASS**｜legacy=**0** scanRoot=**46** rawTail=**4** declined=**2** fallback=**4**，与基线逐项相同 | 绿 |
| throw-shape-alive | `node tests/statement-possible/throw-shape-alive.mjs` | **PASS**｜cases=3 pass=3 fail=0 self-test=3/3 fallback=0 | 绿 |

**额外**（不在要求清单内，主动跑了）：`node tests/statement-possible/control-flow-takeover.mjs` → **cases=39 failed=1**（`outer: while (a) { break outer; }`，`ControlFlowShellCount 增量=1 期望=0`）。
为证明这是基线自带：`git worktree add --detach tmp/baseline-wt 857b82dd` → 在**未删除任何桩**的树上 `xl_build`(892/0) + `tsc`(exit 0) → 同一条命令**同样 failed=1、同一条 case、同一读数**。已 `git worktree remove --force` 清理。**不是本次回归。**

## 9. 残余「未实现」清单（typescript/core/tests，排 dist build build-* tmp）

**29 行 / 15 个文件，0 个 PossibleShape 桩。** 按性质分三类：

**A. 真实类里唯一未实现的方法（保留）**
- `typescript/ast/declarations/import-declaration-ast-node.xl.md:31` `throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现");`

**B. 抽象成员兜底（core，不动）**
- `core/syntax/document.xl.md:85,95,105,115,125`
- `core/syntax/block-token.xl.md:152`
（全部是 `throw new Error("抽象成员未实现");`，`TextDocument` / 块 token 子类覆写）

**C. 散文/注释/字符串元数据（非引用，不改）**
- `typescript/tokens/statements/statement-operator-body.xl.md:326,445,457,536,583,819,950,1798`（「未实现构造」术语）
- `typescript/tokens/statements/statement-shape.xl.md:96`
- `typescript/cases/expression.ts:537,602`、`regex.ts:301`、`types.ts:322`（注释：「尚未实现 / 暂缓」）
- `tests/body-guide/harness.mjs:517`、`tests/member-possible/harness.mjs:6,279`（注释）
- `tests/runtime/check.mjs:1462`（用例标题「调用未实现的东西要抛」）
- `tests/statement-possible/HANDOFF.md:13`、`harness.mjs:4,45,47`、`throw-shape-alive.mjs:4`（说明文字 / skip 原因字符串）

**悬空引用检查**：脚本 `tmp/dangling.mjs` 对 `typescript/ core/ tests/ samples/` 全量解析每条相对 import 目标 → **broken=0**（唯 3 条 "broken" 在 `samples/`，是基线自带的 `./base` 与 `../build/...`，与本次无关；`git show b5fe5a34 --stat` 可证未动 samples）。另外 352 个桩的 basename 与类名在 `typescript/ core/ tests/` 里已无任何 import/实例化行（残留仅 §9-C 的散文与 §5 的注释）。

## 10. 回退命令

```powershell
# 只回退本次提交（未 push，历史保留最安全）
git revert --no-edit b5fe5a34            # 或：git reset --hard 857b82dd

# dist/ build/ 是 gitignore 的生成物，回退后必须重建
Remove-Item -Recurse -Force dist,build
#   xl_build  (cwd=本目录, paths=["core","typescript"], targets=["ts"])
node node_modules/typescript/bin/tsc -p tsconfig.json
```

复核脚本（本机 `tmp/`，未入库）：`tmp/recheck.mjs`（候选+引用分类，产出 `tmp/recheck.json`）、`tmp/dangling.mjs`（悬空引用/破导入）、`tmp/residual-all.mjs`（未实现全扫）、`tmp/deleted.json`（352 条删除清单）、`tmp/delete-stubs.mjs`、`tmp/clean-refs.mjs`（带安全断言的删除与引用清理）。
