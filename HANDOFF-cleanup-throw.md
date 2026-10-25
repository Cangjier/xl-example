# HANDOFF — cleanup-throw：删除 throw 的未实现 possible shape 死桩

工作目录：`feature/possible-statement-cleanup-throw`（分支同名）
基线 HEAD：**`31326fbc`** → 本轮提交：**`264c4fe9`**（删除 + 探针），紧随其后的一个 docs commit（本文件）
状态：提交后工作树干净；`git status typescript/cases` 为空；未 push、未合并、未改任何开关。

---

## 1. 结论先行

1. `throw` 的两个**未实现** possible shape 桩已删除：`ThrowStatementPossibleShape`（statement）与
   `ThrowKeywordPossibleShape`（keyword）。两者 `ComputeByIndex` / `BuildByIndex` 都只 `throw new Error("…未实现")`，
   其中 statement 桩在候选表里只以注释行存在、keyword 桩全仓 0 引用 —— 删除**不可能**改变解析路径。
2. 唯一引用点 `source-file-shape.xl.md` 只删了两行（一行 `import`、一行注释候选），**没有**顺手清其它族的桩。
3. 被保留且未改动的两个"活"文件：`throw-statement-shape.xl.md`（`ThrowStatementShape`，被
   `statement-builder.xl.md` 的 L63 import / L2286 / L2319 使用）与 `throw-keyword-shape.xl.md`
   （`ThrowKeywordShape extends ShapeToken`）。
4. 生成物孤儿：`xl_build` 报 **E2004 ×2**，`xl_orphans {prune:true}` 清掉 2 个 `dist` 产物；
   `build/ts` 下两个 tsc 产物是 `tsc` 不会自清的残留，手工删（均为未跟踪的生成物，未改任何源码语义）。
5. 全门 **12/12 零回归**：删桩前（`31326fbc`）与删桩后逐项读数**完全一致**，差异只有墙钟秒数。
6. 新增行为面探针 `tests/statement-possible/throw-shape-alive.mjs`，**3 形态 × 2 开关档**全部 PASS，
   自检 3/3；用 `git stash` 做的 A/B 反事实里，删桩前后探针输出**逐字节相同**（`IDENTICAL`）。

---

## 2. 删除清单与引用清理

| 动作 | 文件 | 说明 |
| --- | --- | --- |
| 删除 | `typescript/tokens/statements/throw-statement-possible-shape.xl.md` | 25 行，`class ThrowStatementPossibleShape extends PossibleShape`，两个方法体都是 `throw new Error("…未实现")` |
| 删除 | `typescript/tokens/keywords/throw-keyword-possible-shape.xl.md` | 25 行，`class ThrowKeywordPossibleShape extends PossibleShape`，同为未实现桩，全仓 0 引用 |
| 改（−2 行） | `typescript/tokens/files/source-file-shape.xl.md` | 删 L41 `import { ThrowStatementPossibleShape } …` 与 L251 `// new ThrowStatementPossibleShape(),` |
| 新增 | `tests/statement-possible/throw-shape-alive.mjs` | 行为面探针（见 §5） |

`source-file-shape.xl.md` 的完整 diff 只有这两行（可用 `git show 264c4fe9 -- typescript/tokens/files/source-file-shape.xl.md` 复核）：

```diff
 import { SwitchStatementPossibleShape } from "../statements/switch-statement-possible-shape.xl.md"
-import { ThrowStatementPossibleShape } from "../statements/throw-statement-possible-shape.xl.md"
 import { TryStatementPossibleShape } from "../statements/try-statement-possible-shape.xl.md"
@@
     // new LabeledStatementPossibleShape(),
-    // new ThrowStatementPossibleShape(),
     // new TryStatementPossibleShape(),
```

保持不动（正面证据）：

```text
throw-statement-shape.xl.md:9  # class ThrowStatementShape extends ShapeToken
statement-builder.xl.md:63     import { ThrowStatementShape } from "./throw-statement-shape.xl.md"
statement-builder.xl.md:2286   const throwShape = new ThrowStatementShape(this.Template);
statement-builder.xl.md:2319   shape = new ThrowStatementShape(this.Template);
throw-keyword-shape.xl.md:9    # class ThrowKeywordShape extends ShapeToken
```

其它语族的 `*-possible-shape.xl.md` 桩**一个没动**（`git show --stat 264c4fe9` 只有上表四行/四文件）。

---

## 3. grep 0 引用证据

```powershell
# 源码（typescript/ core/ tests/，.md/.ts/.mjs/.js）
Get-ChildItem typescript,core,tests -Recurse -File |
  Where-Object { $_.Extension -in '.md','.ts','.mjs','.js' } |
  Select-String -Pattern 'ThrowStatementPossibleShape|ThrowKeywordPossibleShape'
# → NONE (0 命中)

# 生成物
Get-ChildItem dist,build -Recurse -File |
  Select-String -Pattern 'ThrowStatementPossibleShape|ThrowKeywordPossibleShape'
# → NONE (0 命中)

# 生成物文件名残留
(Get-ChildItem dist,build -Recurse -File -Filter '*throw-*possible-shape*').Count
# → 0
```

---

## 4. 生成物孤儿处理（E2004）

删除 `.xl.md` 之后第一次 `xl_build`（`paths=["core","typescript"]`, `targets=["ts"]`）：

```text
xl build — 1 written, 891 skipped, 0 planned, 0 error(s), 2522 warning(s)
2 orphaned output(s) — the source they were generated from no longer exists:
- dist/ts/typescript/tokens/keywords/throw-keyword-possible-shape.ts
- dist/ts/typescript/tokens/statements/throw-statement-possible-shape.ts
```

处理：

1. `xl_orphans { out:"dist", prune:true }` → **2 found, 2 removed**（只删仍带 xl header 的产物）。
2. `build/ts/.../throw-{statement,keyword}-possible-shape.js`：`tsc` 不会清理 `outDir` 里源已消失的产物，
   这两个 `.js` 是纯生成物（`build/` 被 `.gitignore` 忽略、从未入库），用 `Remove-Item` 删除。
   这一步**没有**碰任何 `dist` 源码内容，也没有手改任何 `.ts` 语义。
3. 一个如实记录的细节：`dist/ts/.xl/cache` 是 xl 的增量归档，A/B 反事实跑完后它会归档"删桩前"的
   `source-file-shape.ts` 旧修订（里面自然还带被删的名字）。为了让"dist 里 0 残留"是字面成立的，
   本轮把 `dist/ts/.xl` 整个清掉再跑一次 `xl_build`（**0 written / 892 skipped / 0 error**，指纹在产物
   header 里，不依赖 cache），cache 重新生成且只含当前态。清 cache 只影响增量索引，不改变任何产物内容。
4. 之后 `xl_build` 稳定为 **0 error**、`node node_modules/typescript/bin/tsc -p tsconfig.json` → **exit 0**。

---

## 5. 探针与反事实（删除不改变行为）

`tests/statement-possible/throw-shape-alive.mjs`（`node tests/statement-possible/throw-shape-alive.mjs [--verbose]`）。

三形态、每条形如"默认态 + legacy 态各投一遍"，判据：

- 解析不抛异常；
- AST 逐节点（`kind` / `pos` / `end` / `text`，前序展开）与 `ts.createSourceFile` **完全一致**；
- 顶层语句 kind 序列符合预期（`throw\nx` 必须是 `ThrowStatement + ExpressionStatement` 两条，禁粘一条）；
- `FileFallbackCount === 0`（文件级 fallback 用一次即失败）；
- 两档 XML 逐字节相同（壳开 / legacy 同一棵树）；
- 自检 3/3：对拍器能看见 `text` 差异与节点数差异，否则 PASS 是空的。

读数（删桩后，最终树）：

```text
PASS self-test identical
PASS self-test text-diff
PASS self-test count-diff
PASS throw-identifier       nodes=3 :: "throw a;"
PASS throw-new-expression   nodes=5 :: "throw new Error(\"x\");"
PASS throw-asi-newline      nodes=5 :: "throw\nx"
[throw-shape-alive] cases=3 pass=3 fail=0 self-test=3/3 fallback=0（两档各投一遍）
```

A/B 反事实（`git stash` 只暂存三个被改的 `.xl.md`，探针留在工作树）：

1. `git stash push -- <3 个 .xl.md>` → 工作树回到 `31326fbc` 的源码（两个桩 + 旧 `source-file-shape`）；
2. `xl_build`（**3 written**，桩产物复活）→ `tsc` exit 0 → 探针 **PASS**，输出存 `tmp/probe-with-stubs.txt`；
3. `git stash pop` → `xl_build`（1 written、E2004 ×2）→ `xl_orphans prune` → 删两个 build `.js` → `tsc` exit 0 → 探针 **PASS**，输出存 `tmp/probe-without-stubs.txt`；
4. `Compare-Object` 两份输出 → **IDENTICAL**（逐字节相同，连 `nodes=` 都一致）。

也就是说：探针的断言在删桩前后**同真**，删除不改变 `throw` 任何形态的解析结果。

---

## 6. 全门读数（删桩前 vs 删桩后）

`xl_build` 0 error + `tsc` exit 0 之后实跑；两个时刻的结论行除秒数外**逐字相同**：

| # | 门 | 删桩前（`31326fbc`） | 删桩后（`264c4fe9`） |
| --- | --- | --- | --- |
| 1 | `typescript/cases/ast-json.mjs` | 6171 / 6171，cj-fail 0 | **6171 / 6171**，cj-fail 0 |
| 2 | `typescript/cases/ast-json-diff.mjs` | 6171 / 6171，结构差 0 / 位置差 0 / 字段差 0 | **6171 / 6171**，0 / 0 / 0 |
| 3 | `typescript/cases/token-ast.mjs --quiet` | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 known-gap=0 | **同左** |
| 4 | `typescript/cases/real-dts-ast.mjs` | 226 / 226，崩溃 0、差异 0 | **226 / 226**，0、0 |
| 5 | `tests/statement-possible/harness.mjs --all` | 102 pass / 0 fail / known=0 / uncovered=0，file-fallback 0 | **同左** |
| 6 | `tests/statement-possible/harness.mjs --double-accept` | 120 / 0，冲突 0 | **120 / 0**，冲突 0 |
| 7 | `tests/statement-possible/declaration-statement-takeover.mjs` | 33 / 33，knownGap=0，takeover=27 | **同左** |
| 8 | `tests/parse/validate.mjs` | 1720 条 / 0 条不合格 | **1720 / 0** |
| 9 | `tests/statement-possible/final-matrix.mjs` | 38 / 38（shapeAst 38/38、xmlEqLegacy 38/38、astEqTS 38/38，knownGap=1 既有） | **同左** |
| 10 | `tests/statement-possible/op-ast-proof.mjs` | 94 / 94 | **94 / 94** |
| 11 | `tests/statement-possible/ast-kind-names.mjs` | PASS（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail 0） | **同左** |
| 12 | `tests/statement-possible/legacy-retirement.mjs --json` | PASS：`0 / 46 / 4 / 2 / 2 / 4`，`differences: []` | **同左**（`legacyStatementDispatch/scanRootCalls/rawTailBuilds/shapeAstDeclined/totalDeclined/fileFallbacks`） |
| 13 | 新增探针 `throw-shape-alive.mjs` | （不适用） | **3 / 3 + self-test 3/3** |

`git status typescript/cases` 在两次跑完后都是**空**（ast-json 的产物未留下脏改动）。

原始读数留档（`tmp/` 未跟踪）：`gates-before.txt` / `gates-after.txt` / `gates-final.txt` /
`probe-with-stubs.txt` / `probe-without-stubs.txt` / `legacy-retirement.json`。

---

## 7. 风险与回退

风险面很小，且已量：

- 两个桩都**未实现**、且不在任何活跃候选表里（statement 桩只有一行注释引用，keyword 桩全仓 0 引用），
  删除不进入任何运行路径；
- 探针的 A/B 反事实证明 `throw a;`、`throw new Error("x");`、`throw\nx` 三形态在删桩前后 AST、XML、
  fallback 计数**完全一致**；
- 12 道门零回归；`ThrowStatementShape` / `ThrowKeywordShape` 未被触碰。

回退命令（cwd = 本目录）：

```powershell
# 整轮回退（推荐）
git revert 264c4fe9          # 恢复两个桩 + source-file-shape 两行；探针留着也能过（它只断言行为）

# 或者只恢复源码、保留探针
git checkout 31326fbc -- `
  typescript/tokens/statements/throw-statement-possible-shape.xl.md `
  typescript/tokens/keywords/throw-keyword-possible-shape.xl.md `
  typescript/tokens/files/source-file-shape.xl.md
# 然后重建（xl_build 工具，paths=["core","typescript"], targets=["ts"]），再：
node node_modules/typescript/bin/tsc -p tsconfig.json
```

注意：回退后 `dist/ts/.../throw-*-possible-shape.ts` 会随 `xl_build` 重新生成（源码回来了，就不再是孤儿）；
若再次前滚删除，记得再跑一次 `xl_orphans {prune:true}` 并删 `build/ts` 下对应 `.js`。
