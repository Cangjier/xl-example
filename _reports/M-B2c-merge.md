# M-B2c · 合并 `feature/b2c-member-kinds` 入主仓库 — 合并报告

| 项 | 值 |
| --- | --- |
| 状态 | **合并完成 + 验收通过**（无冲突、无 reset） |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `d63bacf8`（`$BASE`） |
| 合并源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b2c-member-kinds`，`feature/b2c-member-kinds` @ `03313ce1` |
| 三点 diff | 27 个文件，+1495 / −146（`git merge-base` = `576f8005`，即 B2b 后的真实公共祖先） |
| 合并提交 | `merge(b2c): class/interface member kinds`（`--no-ff`，零冲突） |
| push | **未执行**（禁止 push/pull origin，符合约束） |

---

## 1. 合并内容

`MemberHeadScan.Plan`（property / method / constructor / get / set / index / static-block / construct）、
成员壳 / name / params / body 接线、3 个结构修复（孤儿壳 `Parent = host`、相邻成员 `OpenNextHead`、
`IsHeadParameterBracket` 只认头一个 `(`）、`external-dts-known-gap.txt` 缩减 3 条。
另带入 `_reports/B2c.md`（145 行实施报告）。

**冲突**：0 条（`git merge` 自动完成，工作树即刻干净）。

---

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，paths core+typescript，target ts） | **25 written / 604 skipped / 0 error**，3 warning（E1107 三条 `GetAccessor/SetAccessor/IndexSignature PossibleShape` 同名声明，B2c 既有、非本轮新增） |
| `tsc -p .` | **exit 0** |

---

## 3. 验收读数（合并后实测）

| 套件 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs`（默认 incremental） | 4 / 0 / 7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | PASS |
| `tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7**，exit 0 | PASS |
| `wide-ast`（默认） | 0 崩溃 / 32–33 差异 / 90–94 fallback | **崩溃 0/5（全在预期清单）/ 差异 33/87 / `FileFallbackCount` 85（打印 85+13=98，天花板 94）/ 缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0** | PASS |
| `wide-ast --legacy` | 0 / 0 / 2 | **0 / 0 / 2** | PASS |
| `real-dts`（默认） | PASS | **226 文件、崩溃 0/5、AST 全一致 226、差异 0/87** | PASS |
| `real-dts --legacy` | 0 / 0 | **0 / 0** | PASS |
| `tts run.mjs --quiet` | PASS（429） | **exit 0** | PASS |
| `tts-impl run.mjs --quiet` | exit 0 | **PASS 0 / FAIL 0** | PASS |
| `tshape-judge ts-all` | 429 / 426 / 3 | **429 / 426 / 3**（total 429、ok 426、failures 3，与基线同名三条） | 基线一致 |

### 3.1 与 B2c 自身读数的偏移（登记，不 reset）

- 差异 **33**（B2c 单分支 32）：落在任务给出的 32–33 区间内 ⇒ 属 B3b 合并后的正常漂移。
- fallback：B2c 单分支 90，合并后本仓 `FileFallbackCount` **85**（打印口径 85+13=98 含 13 条白名单），
  90 → 98 属白名单计数口径差, 门的判据 `85 ≤ 94` 且 `policyProblems 0`，**PASS**。
- 其余读数逐项一致；无崩溃、无缺 range、无越界。

### 3.2 `steps` 探针（class / interface 成员各在各自 token 格）

`tmp/class-members.ts`（`class C { m(a: number) { return a; } constructor() {} get x() { return 1; } [k: string]: any }`，带 BOM，step 比 B2c 的 0 基读数 +1）：

| shape | step | char |
| --- | ---: | --- |
| `MethodDeclarationShape` | 12 | `(` |
| `ConstructorShape` / `ConstructorKeywordShape` | 49 | `(` |
| `GetAccessorShape` / `GetKeywordShape` | 58 | ` ` |
| `IndexSignatureShape` | 87 | `]` |

`tmp/interface-members.ts`（`interface I { m(a: number): void; new (x: number): I; [k: string]: any }`）：

| shape | step | char |
| --- | ---: | --- |
| `MethodSignatureShape` | 16 | `(` |
| `ConstructSignatureShape` / `NewKeywordShape` | 38 | ` ` |
| `IndexSignatureShape` | 65 | `]` |

四族各自在自己的 token 格建对应外壳 ⇒ **Method / Constructor / Get(Set)Accessor / IndexSignature 全部命中**。

---

## 4. 收尾

- **未**重生成 INDEX / README（B5 已做；B2c 改变读数，文档同步留后续）。
- 临时探针文件（`tmp/class-members.ts`、`tmp/interface-members.ts`、`tmp/tshape-judge/**`）在 gitignore 的 `tmp/` 下，未提交。
- 合并临时 ref `refs/merge/b2c` 已删除；源目录 `xl-example-set\b2c-member-kinds` 已解 junction 并删除。
- 最终 `git status --short` 为空。

---

## 5. 复算命令

```powershell
$repo = "C:\Users\Admin\Documents\GitHub\xl-example"
Set-Location $repo
node node_modules/typescript/bin/tsc -p .
node tests/gates/run.mjs            # 4 / 0 / 7
node tests/gates/run.mjs --legacy   # 4 / 0 / 7（含 wide-ast 0/0/2、real-dts 0/0）
node tests/parse/wide-ast.mjs       # 0 崩溃 / 33 差异 / fallback 85（+13 白名单）
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3
```
