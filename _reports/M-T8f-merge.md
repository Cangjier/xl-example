# M-T8f 合并报告：允许匿名 `export default function ()`

- 目标分支：`feature/all-possible-1027`
- 合并前 HEAD：`bb91c14e`（工作树干净）
- 待合并：`refs/merge/t8f` ← `45bb4c6c`（base `bb91c14e`），来自
  `xl-example-set/all-possible-1027-t8f` 的 `feature/all-possible-1027-t8f`
- 合并后 HEAD：`66bb338a`

## 1. 预检

三点 diff（`bb91c14e...refs/merge/t8f`）恰好 2 个文件、与任务书一致：

| 文件 | 变化 |
| --- | --- |
| `typescript/tokens/declarations/forms/export-inner-declaration-delegate.xl.md` | +8 / −1 |
| `_reports/T8f.md` | 新增 206 行 |

`git merge-base` = `bb91c14e`，即快进式三分支，无交叉基线。

## 2. 合并

```
git merge --no-ff refs/merge/t8f -m "merge(t8f): allow anonymous export default function"
```

`ort` 策略，**0 冲突**（上限 2 未触及），`_reports/T8f.md` 以 `create mode` 新建。

内容即 T8f 的那一处改动：`export-inner-declaration-delegate` 里
`FunctionDeclarationShape.FromUnits(...)` 的第 5/6 实参由 `false, false` 改为
`false, true`，`allowAnonymous = true`——本委托内 `ProbeKind` 只在 `default` 同行
`function` 时给出 `KindFunction`，因此该实参恒真，`export default function ()` 收口。

## 3. 验证（未跑 gates）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| xl build（ts 目标） | `xl_build` 全量 | 638 源，0 error、3 既有 `E1107` warning |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 30 target | `node tmp/target-cases.mjs` | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**，`LastFileFallback=0`，`pin-miss=1`（`026` 头部 `xl:expect fallback` 为既有现象） |
| 目标 judge | `tshape-judge.mjs ts …/mod-export-default-function-anon.ts` | `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| 目标 fallback | `node tmp/t8f-one.cjs <目标用例>` | `fb:false`、`count:0` ✓ 无 fallback |
| 全语料 fallback | `node tmp/t8f-probe.mjs` | `TOTAL=1716 FALLBACK=61` ✓（**62 → 61**） |
| 5 smoke SHA16 | `tshape-judge.mjs ts tmp/smoke-t7e/s1..s5.ts` → `ts.json` SHA256 前 16 位 | **5/5 `BB07DA2201FC5087`** ✓ 不变 |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

`dist/` 未入库（`.gitignore`），本轮由 `xl_build` 重新生成后再 `tsc`；
`tmp/t8f-probe.mjs`、`tmp/t8f-one.cjs` 自 T8f 工作树取来，验证后已清理。

## 4. 清理

- `tmp/t8f-probe.mjs`、`tmp/t8f-one.cjs`、`tmp/t8f-diff.cjs`、`tmp/m-t8f-fallback.json`、
  `tmp/m-t8f-judge/`、`tmp/m-t8f-smoke/` 已删除，`Get-ChildItem tmp -Filter "*t8f*"` 无残留。
- `git update-ref -d refs/merge/t8f` 已执行。

## 5. 结论

T8f 干净合入。匿名默认导出函数（`export default function ()`）不再 fallback，
全语料 fallback **62 → 61**（恰 −1）；30 target **30/30、fallback=0**；目标 judge **ok**；
5 smoke SHA16 **全部不变**。build 0 error、tsc exit 0。最终 HEAD `66bb338a`。
