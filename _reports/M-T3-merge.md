# M-T3 · 合并 T3 成员名让位（026 → ok）

## 1. 结论

| 项 | 读数 |
|---|---|
| 合并前 HEAD | `de265bb4`（工作树干净） |
| 合入 commit | `0fd34c59`（`feature/all-possible-1027-t3`，base = `c1e64c03`） |
| 合并后 HEAD | **`7ff97547f49e3bb302e6be2e3ecfc0b67d3c35c7`** `merge(t3): member-name atom yields for control heads` |
| 策略 | `git merge --no-ff` + `ort`，**0 冲突**（未手工干预） |
| 规模 | 6 files changed, 219 insertions(+), 2 deletions(-) |
| 三点 diff 预检 | 仅 `control-head-possible-shape.xl.md` / `statement-route-util.xl.md` / `tmp/` / `_reports/` ✅ |

## 2. 验证（未跑 gates）

### 2.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(cwd=<main>, paths=["core","typescript"], targets=["ts"])` | **2 written / 636 skipped / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

3 条 warning 均为既有 E1107（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），非本次引入。

### 2.2 30 条 target（`node tmp/target-cases.mjs` / `tmp/target-on.mjs`）

| 开关 | 读数 |
|---|---|
| 关（默认） | `SUMMARY: cases=30 ok=29 moved=0 diff=0 error=0 fallback=1 | LastFileFallback=1（其中回退后 AST 仍 ok=1） | pin-miss=0` |
| 开 | `SUMMARY: cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 | LastFileFallback=0 | pin-miss=1` |

关档 29 ok / 1 fallback（026）/ 0 diff / 0 error，pin-miss=0；开档 30 ok / 0 fallback / 0 diff / 0 error，pin-miss=1 仅因 `026.ts` 仍写 `xl:expect fallback`（T4 输入，未改）。

### 2.3 026 的 `tshape-judge ts`

| 档 | status | exit |
|---|---|---|
| 关（默认） | `incremental-error` | 1 |
| 开（`node --require ./tmp/preload-on.cjs`） | **`ok`** | 0 |

### 2.4 5 个 smoke（`tshape-judge ts` → `ts.json`，SHA256 前 16 位，关 / 开）

| case | source | exit | sha16 |
|---|---|---|---|
| `smoke-if` | `if (a) {}` | 0 / 0 | BB07DA2201FC5087 / BB07DA2201FC5087 |
| `smoke-add` | `const a = x + y` | 0 / 0 | BB07DA2201FC5087 / BB07DA2201FC5087 |
| `smoke-call` | `f(a)` | 0 / 0 | BB07DA2201FC5087 / BB07DA2201FC5087 |
| `smoke-class` | `class A {}` | 0 / 0 | BB07DA2201FC5087 / BB07DA2201FC5087 |
| `smoke-obj` | `const o = { a: 1 }` | 0 / 0 | BB07DA2201FC5087 / BB07DA2201FC5087 |

5/5 开 / 关都等于 T1 基线 `BB07DA2201FC5087`。

## 3. 清理

- `xl-example-set/all-possible-1027-t3`：先解 `node_modules` junction，再删整目录；主仓 `node_modules/typescript/package.json` 仍在。
- `git update-ref -d refs/merge/t3`（`show-ref --verify` 已不存在）。
- 未 push、未改源码、未建分支。

## 4. 与预期的差异

无偏差：build 0 error、tsc 0、OFF 29/1/0/0、ON 30/0/0/0、026 ON=ok / OFF=incremental-error、5 smoke SHA16 = `BB07DA2201FC5087`。
