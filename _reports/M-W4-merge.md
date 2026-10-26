# M-W4 合并报告：`feature/w4-corpus` → `feature/all-possible`

**状态：完成。** 零冲突合并，全部验收口径与预期逐项相符；目录已清理，合并 ref 已删除，未 push。

## 0. 一句话

`refs/merge/w4`（`0b1d2c9a`，base `d1965752`）以 `--no-ff` 合入主仓库，**4 文件、+527/−40、0 冲突、零 parser 改动**；
default 档 **语料 1945 / 崩溃 0 / 差异 0 / FileFallbackCount 2 / distOnlyKinds 0**、
**tts 429 PASS**、**tshape-judge 426 ok / 3 失败**、**gates 4 通过 / 0 失败 / 7 不适用** 全部通过；
incremental 档 **20 / 87 / 94（外部 16）** 与预期字字相同，**预期 red**（15 条非 `lib.*.d.ts` 崩溃，ownership 属 W3）。

## 1. 合并身份

| 项 | 值 |
| --- | --- |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example` |
| 当前分支 | `feature/all-possible` |
| `$BASE` | `d19657522250520ee56ed562e0b622cfe2eb904d`（合并前 HEAD，工作树干净） |
| 合并来源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\w4-corpus` @ `feature/w4-corpus` = `0b1d2c9a8288e6a96e616a39db181d7f2b62ef96` |
| merge-base | `d1965752`（= `$BASE`，真祖先，无需 rebase） |
| 合并 ref | `refs/merge/w4`（`git fetch --no-tags ... "feature/w4-corpus:refs/merge/w4"`） |
| 合并提交 | **`e59b09f2`** `merge(w4): drop dist corpus + external dts known-gap + gate tiers`（`--no-ff`，双亲） |
| 冲突 | **0**（`ort` 策略直接合并成功；未触发「≤3 手工保双侧」流程） |

三点 diff 预检（`git diff --name-status d1965752 refs/merge/w4`）与交办清单逐字一致：

```
A  _reports/W4.md
M  tests/gates/run.mjs
A  tests/parse/external-dts-known-gap.txt
M  tests/parse/wide-ast.mjs
```

**零 parser 改动**已核对：`typescript/**`、`core/**`、`samples/**`、`tests/cases/**` 一件未动；
没有新增/删除任何 `.xl.md`，因此 `xl_build` 的产物集合不变。

## 2. 重建

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 生成 | `xl_build`（`paths=["core","typescript"]`, `targets=["ts"]`, cwd=repo） | **0 written / 628 skipped / 0 error / 3 warning** |
| 编译 | `node node_modules/typescript/bin/tsc -p .` | **exit 0**，无输出 |

- `628 skipped (up to date)` 是正确结果：本波只改 `tests/**`，不产生新的 xl 源，指纹全部命中。
- 3 条 warning 是**既有的** `E1107` 重复类型声明（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` /
  `SetAccessorPossibleShape` 各在 `class-*-possible-shape.xl.md` 与 `*-possible-shape.xl.md` 同时声明），与 W4 无关。
- `dist/` 由 `.gitignore:2` 忽略，重建不污染工作树（这也是最终 `git status` 保持为空的原因之一）。

## 3. 验收（逐项实测，全部对上预期）

| 验收项 | 预期 | 实测 | |
| --- | --- | --- | --- |
| default `wide-ast` 结论 | PASS | **PASS**，exit 0 | ✅ |
| default 语料 | 1945 | **1945**（`node_modules .d.ts=226`、`samples .ts=3`、`tests/cases/token .ts=1716`） | ✅ |
| default 崩溃 / 有差异 | 0 / 0 | **0 / 0**（解析成功 1934，跳过 TS 非法 11） | ✅ |
| default `FileFallbackCount` | 2 | **2**（`FileFallbackByFamily tests/cases/token=2`） | ✅ |
| default `ExternalFallbackCount` | 0 | **0**（登记 16 件，默认档命中 0 —— 白名单只在 ON 档起作用） | ✅ |
| default `distOnlyKinds` | 0 | **0**（`dist/ts` 629 件只当证据：119 种 kind，语料并集 221 种，剔除不丢种类） | ✅ |
| `tshape-judge ts-all` | 426 / 0 / 3 / 0 / 0 | **total 429 / ok 426 / failures 3**（3 条全为 `incremental-error`）；exit 1 属预期 | ✅ |
| `tts`（`tts:cases`） | PASS 429 | **PASS 429 / FAIL 0 / 429**，exit 0 | ✅ |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7**（11 道门并行，墙钟 6.5s） | ✅ |
| incremental crash | 20 | **20** | ✅ |
| incremental diff | 87 | **87**（AST 完全一致 1827） | ✅ |
| incremental fallback | 94 | **94**（`FileFallbackCount 94`，天花板 94） | ✅ |
| incremental `ExternalFallbackCount` | 16 | **16 / 16 命中**（白名单真正起作用） | ✅ |
| incremental `distOnlyKinds` | 0 | **0** | ✅ |

通过的 4 道门：`direct:lint`、`cases:check`（1720 条用例 0 条不合格）、`wide-ast`、`real-dts-ast`。
7 道 N/A 全是「命令依赖的源/产物在本仓库根本不存在」（`runtime/`、`tsrun.xl.md`、`print-ast-common.xl.md`×3、`dawn/`、`dist/cpp`），
**不是放过真实失败**，逐条理由由门自己打印。

### 3.1 incremental 档为何是 red（预期内，不修）

`node tests/parse/wide-ast.mjs --incremental-on` → `FAIL`，两条口径：

1. `崩溃 20 > 天花板 5`；
2. `15 条崩溃不在 lib.*.d.ts 预期清单里`（如 `expr-as-then-value-operator.ts`、`expr-as-type-nonnull-tail.ts`、
   `expr-r1228-array-tag.ts` 等，全部落在 `tests/cases/token/expressions|statements|types`）。

这 15 条正是 D5 §1 的 **B2/B3/B4/B5**，ownership 全在 **W3**（legacy 根层 `SourceFileShape` 候选歧义）。
按要求**本波不动阈值、不动 `INCREMENTAL_CRASH_EXPECTED`**，把 red 留在该留的地方：
default 档仍全绿，ON 档的 20 与 5 分开记账，新冒出来的崩溃不会被吞。W3 落地后此档应自行转绿。

## 4. 清理

| 动作 | 结果 |
| --- | --- |
| `w4-corpus\node_modules` junction（→ 主仓库 `node_modules`） | **先解链**：`cmd /c rmdir`（只删 reparse point，不递归目标），exit 0 |
| 解链后主仓库 `node_modules` | **完好**：顶层 5 项不变，`typescript\bin\tsc` 仍在 |
| 剩余 reparse point 复查 | **none**（确认无残留 junction 才递归删） |
| 删除 `C:\...\xl-example-set\w4-corpus` | **已删**（`exists=False`） |
| 同级目录 | **未触碰**：`d0-default-on`、`d3-triage`、`d5-triage`、`w1-end-possible`、`w2-shell`、`w3-root-ambiguity`、`w5-module`、`_reports` 全部保留 |
| `git update-ref -d refs/merge/w4` | 已删除（见 §5 末行核对） |
| 主仓库 `git worktree list` | 只有 `xl-example` 一条 —— `w4-corpus` 从来不是注册 worktree（自带 `.git` 的独立克隆），无需 `worktree remove` |

`w4-corpus` 是独立克隆这一点值得记一笔：它没有注册在主仓库的 worktree 列表里，所以清理只有「解 junction + 递归删」
两件事，没有 `git worktree prune` 这一步。

## 5. 硬规则遵守

- **未 push、未 pull origin**：全程只 `git fetch` 本地路径到 `refs/merge/w4`（本地临时 ref）。
- **未改源码**：零冲突，因此除合并带入的 4 个文件外没有手工编辑任何文件。
- **未建新分支**：只在 `feature/all-possible` 上产生一个合并提交。
- **未重生成 INDEX / README**：按交办留给 B5。
- **未把 94 条 fallback 冻结成允许列表**：W4 明确未做，本波亦不做 —— 冻结等于把「真源缺口」改写成「允许 fallback」，
  是策略决定，不是合并能自己拍的。
- **未动阈值 / 未动 `external-dts-known-gap.txt` 内容**：白名单 16 件原样合入。
- 最终 `git status --short`：**空**（`dist/` 被忽略、报告已提交）。

## 6. 交接

1. **B5**：文档旧数字仍待改 —— `tests/MIGRATION.md` 第 97/110/167 行与 `README.md` 第 209/221/228 行还写着
   「505 件」/「`dist/ts` 560」；现状是 **1945 件、无 `dist/ts`**（且 560 在 W4 之前就已是旧数，实际 628）。
2. **W3**：incremental 档的 15 条非 lib 崩溃仍是本档唯一 red，落地后**不要改阈值**，先删
   `INCREMENTAL_CRASH_EXPECTED` 里已修好的行。
3. **94 条 fallback 的冻结决策**仍在池子里（真源缺口 93 条 `tests/cases/token` + 1 条 `samples/declarations.ts`）；
   若要冻，位置在 `tests/parse/` 旁边，天花板从 93 起算。
