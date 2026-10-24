# HANDOFF — impl-wp2-7（WP-2 predicate 回归修复）

STATUS: COMPLETE
BRANCH: impl-wp2-7 @ 见 `git log -1`
BASE: impl-wp2-5 @ db2418e7

## 做了什么
- 建 clone：`.\tools\new-member.ps1 -Name impl-wp2-7 -From impl-wp2-5 -Base impl-wp2-5`（起点 `db2418e7`）。
- 复现（修前）：`node tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 8`
  → `xml: PASS 4503 / FAIL 0 / ERROR 1 / 同错 52`，`FAIL [parse] tests/cases/token/types/type-fn-return-typeliteral.ts`。
- 根因（已确认，不再只是怀疑）：`StatementBlockStream.HasStatementPrefix` 把 `=>` 列在白名单里。
  `type A4 = () => { a: number }` 的 `{` 宿主是 `context.Root`（语句容器，过身份闸），前缀是 `=>` → `Wants` 通过
  → 该括号被设 `StatementBodyItemHost`，块内 `a: number` 被当语句建出，括号 `Data` 里不再是 basic token；
  `TypeBuilder.ParseTypeLiteral` 用 `inner.Units` 解析成员时首单元不是 `Common`/`String`
  → 抛「不支持的对象类型成员」（`typescript/tokens/types/type-builder.xl.md:1372`）。
  这与 merge-wp2 的怀疑一致：`c40bd740` 的真流式 `BracketHook` 误挂类型位置的 `=> {`。
- 修复（只改两个允许文件）：
  - `typescript/run/statement-block-stream.xl.md`：`HasStatementPrefix` **删除 `=>` 分支**
    （原 `if (previous instanceof Symbol) return (previous as Symbol).Is("=>")` 整段去掉，运算符一律不挂）。
    文档写清取舍：`=> {` 既是箭头体、也是函数类型返回的对象类型字面量，`{` 之前尾部上下文完全相同
    （都是 `)` `=>`），无法用局部上下文区分；箭头体回退 `BuildBlock` 旧循环，AST 与基线逐字节一致。
  - **保留不变**：`BatchMode===0` / `Enabled` 开关、非 `{}` 早退、`BatchAdapter !== null` 早退、
    宿主身份闸（Root 或已被 `StatementBodyItemHost` 接管过的块括号）、`switch` 例外、
    `)` / `else` / `try` / `finally` / `do` 白名单。**未改 `core/**` 与 `typescript/tokens/statements/**`。**
  - `tests/body-drive/stream-proof.mjs`：`arrow-body` 期望改为「箭头体不挂」后的真实行为
    （mounts=1 / streaming=1 / legacy=0 —— 箭头体不挂，其内部嵌套块因宿主是裸 `Bracket`、`BatchAdapter === null`
    过不了身份闸，也一并回退旧循环）；新增 `type-literal-after-arrow` 回归守卫
    （`type A = (opts: X) => { a: number };` 类型字面量绝不挂载，mounts=1 / streaming=1 / legacy=0）。

## 门禁读数（本分支实测，2026-10-24）
| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B 构建 | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | 887 files / 0 error；tsc exit 0（3.8s） | PASS |
| E buffer 等价 | `node tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 8` | **xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；digest 同（基线口径） | **PASS（回归恢复）** |
| P 真流式证明 | `node tests\body-drive\stream-proof.mjs` | PASS 92 / FAIL 0（5 段语料） | PASS |
| O item oracle | `node tests\body-drive\item-oracle.mjs` | RESULT PASS（450 前缀） | PASS |
| S batch split | `node tests\body-drive\batch-split.mjs` | PASS（19 段 / 170 断言 / 0 失败） | PASS |
| A AST 全量 | `node typescript\cases\ast-json.mjs` + `ast-json-diff.mjs` | 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| Q quick | `..\tools\gates.ps1 -Tier quick` | 4 项 ok，RESULT PASS（5.5s） | PASS |
| St standard | `..\tools\gates.ps1 -Tier standard` | 8 项 ok + 1 KNOWN-RED（`tests/gates/run.mjs` 基线 1/8），RESULT PASS（10.3s） | PASS |
| XC xl_check | `xl_check`（改动文件） | 0 error | PASS |

## 未完成项
- 「type 上下文守卫」未做：想保留箭头体流式就得区分「类型位置 `=> {`」与「箭头体 `=> {`」，
  局部只看到 `)` `=>`，需要往前扫到 `type X =` / `:` 并判断是否处于类型上下文——多种写法（泛型、条件类型、
  重载签名、`satisfies`）容易引入不稳定启发式。按「保绿优先」选择最保守解：`=>` 一律不挂。
  真要做，建议在 `TypeBuilder` 侧给出「该括号是类型字面量」的标记，或在 hook 里查询已建 token 的 type-position 状态，
  而不是靠字符前缀猜。
- 性能：箭头体（及其内层块）从流式退回旧循环，`c40bd740` 这部分收益会下降；本轮未测 perf（并发下只作参考）。
  `statement-scaling` 的 2 项 perf FAIL 是 merge-wp2 已记录的既有读数，与本修复无关。

## 下一步的精确命令
```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name merge-wp2-2 -Base refactor-integration
cd merge-wp2-2
..\tools\fetch-branch.ps1 -From impl-wp2-7 -Branch impl-wp2-7
git merge --no-ff impl-wp2-7/impl-wp2-7 -m "merge WP-2 statements engine + real streaming, predicate fix (impl-wp2-7)"
# 去 HANDOFF*.md（本文件是 HANDOFF.impl-wp2-7.md，别合进集成分支）
# xl_build(core,typescript→dist) → tsc → ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
```

## 阻塞点
- 无。

## 踩过的坑
- merge-wp2 怀疑的「`=> {` 被当语句块」完全正确；先跑修前复现拿到 4503/1 ERROR 再动手，能省掉猜。
- 只去掉 `=>` 后，**箭头体里的嵌套块也不再流式**（`IsStatementContainer` 要求宿主括号已有 `StatementBodyItemHost`）。
  这是预期级联，不是新缺陷；`stream-proof` 的 `arrow-body` 期望必须按这个实际情况写（本轮踩过：先按 2 挂载写，实测 1）。
- `ast-json.mjs` 会重写 `typescript/cases` 快照，跑完 `git checkout -- typescript/cases` 再提交。
- buffer-equivalence 的 `--quiet` 会把失败压成汇总；定位到文件要去掉 `--quiet` 或用 `Select-String` 过滤 `^\s*(FAIL|ERROR)\s`。
