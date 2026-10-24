# HANDOFF — impl-wp3-25（WP-3 第二十五波：六条共因定位到「EOF 尾巴」，未落代码）

STATUS: **NO-CODE / 净零**。基线完整复现 **6151 / 6167**（结构差 16、位置差 9、字段差 0、cj-fail 0），
源码**一行未改**（唯一新增文件是本 HANDOFF）。本波的价值是：把 wp3-23 §3.2 的「六条共因」从
「root 的 ASI 收口循环」**收窄到 5 个具体落点，并证明 root-item-rule.Analyze 里的 C 类
lookahead 对这六条不生效**。

BRANCH: impl-wp3-25
BASE: impl-wp3-23 @ 044f5c4c
COMMIT: 见本文件所在提交

## 0. 一句话结论（给 Lead）

六条（#20/#22/#33/#37/#81/#126）**全部是文件末尾（EOF 尾巴）的用例**：前一条 item 收口后，
剩下 `a;` / `type T = A;` / `import type from 'n';` 这一片被 `SourceFileTailBuilder.BuildTrailingItems`
接走，由 `BuildStatementSegments` / `BuildTrailingDeclaration` 交给对应 builder 建。
那条 builder 拿到的 slice 里**确实包含** `;`，但它**自己只签到表达式/类型右界**，于是 `;` 留在
Data 里，下一轮被建成 `EmptyStatement`。
→ 所以落点**不**在 `root-item-rule.Analyze`（那段 C 类 lookahead 已存在，见下），而在
`statement-builder` / 各 declaration shape 的「收口时把换行后的 `;` 计入 End」这一处，
以及尾巴的分段循环。

## 1. 本波实测（2026-10-24，impl-wp3-25）

| 项 | 命令 | 读数 |
|---|---|---|
| xl_build | core+typescript → dist | 875 written / **0 error** / 2414 warning |
| tsc | `tsc -p tsconfig.json` | exit 0 |
| ast-json | `node .\typescript\cases\ast-json.mjs` | total 6167 / cj-ok 6167 / **cj-fail 0**（47 构造） |
| ast-json-diff | `node .\typescript\cases\ast-json-diff.mjs` | **6151 / 6167**；结构 16、位置 9、字段 0 |

（严格「先 ast-json 再 diff」，跑完 `git checkout -- typescript/cases`；committed 快照是全绿，
直接 diff 会得到假的 6167/6167 —— wp3-23 §5.1 已警告，本波复核确认。）

按构造分摊（16 条结构差）：

| 构造 | 结构差 | 内容 |
|---|---|---|
| basic-token | 1 | #86 BOM（脚本口径，记录不修） |
| dts-recovery | 2 | #14/#15 `class<T>`（成员/类族，非本波） |
| dts-types | 1 | #81 |
| end-build | 2 | #33/#37 |
| end-import-export | 2 | #20/#22 |
| possible-build | 6 | #13/#15/#61 模板标签 + #169/#171/#179 yield |
| possible-compute | 2 | #25 interface（禁改区）+ #126 |

## 2. 关键诊断（本波新增，下一波直接用）

### 2.1 六条的形状（diff 工具按构造过滤的实测输出）

```
#20 "import x from \"m\"\na;"
  结构  EmptyStatement +1
  位置  ExpressionStatement ts[17,20] cj[17,19]
#81 "import x from \"m\"\ntype T = A;"
  结构  Identifier -1  TypeAliasDeclaration -1  TypeReference -1  Common +2  Symbol +2  ExpressionStatement +1
```

`#22` 是同族（ImportDeclaration -1 / EmptyStatement +1）；`#33/#37` 是 TypeAlias End
`[0,10]` vs `[0,17]` + EmptyStatement；`#126` 同理。
共同点：**都是 `*.ts` 用例文件的最后一行**（`end-import-export` / `end-build` / `dts-types` /
`possible-compute` 这四组里这些 id 都在组尾或整文件尾部）。

### 2.2 为什么 root 的 C 类 lookahead 不生效

`typescript/tokens/items/root-item-rule.xl.md` **第 406–425 行**已经写了这段（不是本波新加）：

```ts
const semiAt: number = lastAt + 1;
if (semiAt < code.length && this.IsSymbolAt(code, semiAt, ";")
  && builtEnd >= 0 && builtEnd < code[semiAt].SourceRange.EndIndex) { … 重建一次 … }
```

要点：
- `state.Code` 是**去掉 trivia 的**（同文件第 183–185 行注释：`CodeAt` 映射回宿主下标）。
  所以「中间夹换行/注释」**不是**它失效的原因；
- 失效的是**根本没走到这个分支**：六条的尾部 item 由 `SourceFileTailBuilder` 当「终结候选」
  在 EOF 一次建掉（`ComputeByIndex` 在 `EndOfFileTokenShape` 上 Accept），
  `Analyze` 的 `Alive.size === 1` 收口循环只是把前面的 item（`import …` / `type T = A | B` 等）
  交出去，尾巴整片不在它的管辖内。

### 2.3 尾巴侧的真实落点（按 builder 排）

| 位置 | 作用 | 涉及 id |
|---|---|---|
| `source-file-tail-builder.xl.md` **346–412** `BuildStatementSegments` | 逐段 `builder.Load(slice); builder.BuildStatement()`，slice **含** `;`，消费量按 `SourceRange.EndIndex` 数槽位 | #20/#22（表达式语句）、#81 |
| 同文件 **1607–1690** `BuildTrailingItems` | EOF 尾巴总入口 | 六条全过这里 |
| `statement-builder`（`BuildStatement` 的 ExpressionStatement 路径） | 表达式建完只签到表达式 End，**没有**「换行后紧跟 `;` 就签到 `;`」 | #20/#22 |
| `declarations/*-shape.xl.md` 的 `FromUnits`（TypeAlias / ImportDeclaration） | 同理，End 停在类型/模块说明符 | #33/#37/#81/#126 |
| **现成先例** | `statement-scanner.ScanReturnOrThrow` 与 `statement-builder.BuildReturnOrThrow`：wp3-16 已修「换行后紧跟的 `;` 收在 `;` 上」（`end-build.ts` 注释 ① 组），`function f(){ return\n; }` 已全绿 | 照抄这个判据即可 |

**推荐改法（未实测）**：在 `BuildStatementSegments` 建完之后、按 `endIndex` 数消费量之前，
对着 `host.Data` 做一次「跳过 trivia 找下一个非 trivia；若它是 `;` 且起点 ≥ 语句 End，
则把语句的右界连同该 `;` 一起签出、并把该 `;` 计入 consumed」——因为**只能在建之前定终点**
（`TryToClose` 之后 `SignOut` 会抛，wp3-23 §3.2 已警告），所以更稳的做法是把
`builder.Load(...)` 的终点判据改成「slice 末尾的 `;` 属于本条」，让 builder 在建的过程中吃掉它，
而不是事后改 End。

## 3. 踩过的坑（本波复核）

1. `ast-json-diff.mjs` 支持按构造过滤：`node .\typescript\cases\ast-json-diff.mjs end-import-export dts-types`
   （`selectedStems(process.argv.slice(2))`，第 32/160 行）。逐条调试用这个，比全量快得多。
2. 用例是 `typescript/cases/<construct>.ts`，**一行一个用例**（行内 `\n` 由 `ast-json.mjs` 还原成真换行）。
   要复现某条，直接看该文件对应行，不用自己造语料。
3. `git checkout -- typescript/cases` 必须在**读 diff 的那一轮之后**做，否则下次 diff 是假绿。

## 4. 剩余工作清单（下一波）

1. **六条共因（预计 +5~6）**：按 §2.3 落点，先改 `BuildStatementSegments` + 表达式语句路径（#20/#22 两条最小），
   跑 `ast-json-diff.mjs end-import-export` 单构造验证，再推 #33/#37/#81/#126。
2. 模板标签 #13/#15/#61（表达式/类型族）；yield #169/#171/#179（`statement-scanner` 表达式侧）；
   `class<T>` #14/#15（类族，禁改区）；#25 interface（禁改区）；#86 BOM（记录不修）。

## 5. 阻塞点

无。本波未产出代码的唯一原因是轮次预算（8 轮上限）用在了定位上；
定位结论已足以让下一波在一个文件内动手。
