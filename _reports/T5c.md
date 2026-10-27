# T5c 路：`types/` 下 `*PossibleShape` 加 `source:PossibleSource`

- 集成分支：`feature/all-possible-1027` @ `c1e64c03`
- 工作分支：`feature/all-possible-1027-t5c`
- 工作副本：`xl-example-set/all-possible-1027-t5c`
- 范围：只改 `typescript/tokens/types/` 下的 `*-possible-shape.xl.md`。**纯机械签名迁移**，不改行为。
- 未碰：`statements/`、`declarations/`、`expressions/`；未跑 gates / wide-ast / tts；未 push。

## 1. 候选统计

| 项 | 数 | 说明 |
|---|---|---|
| `*PossibleShape` 源文件 | **16** | `types/` 下全部 `*-possible-shape.xl.md` |
| `extends PossibleShape` 的类 | **16** | 每文件恰好一个（`parameter-list` / `property-signature` 两个文件里另有 util 类，不继承） |
| `ComputeByIndex` 声明 | **16** | 与类一一对应 |
| `Compute` 覆写 | **0** | `types/` 下无人覆写 `Compute`（基类转调即可） |
| `super.ComputeByIndex(...)` 内部转调 | **0** | 16 个候选都直接调 `MemberPossibleUtil` / 共享扫描，没有父类转调，故无需透传 |
| 已改 | **16 / 16** | 100% |
| 新增 import | **16** | 每文件一行 |

3 对同名候选**两侧都改**（未去重）：`class-get-accessor` / `get-accessor`、`class-index-signature` / `index-signature`、`class-set-accessor` / `set-accessor`。

## 2. 签名 diff（16 个文件逐字同一条）

```
-## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates
+## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates
```

依赖块首行新增（与 T2 已迁移文件的写法一致）：

```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
```

改动量：`16 files changed, 32 insertions(+), 16 deletions(-)`（每文件 +import、−/＋ 签名各一行）。方法体、注释、示例、`BuildByIndex` 一个字未动。

## 3. 文件清单

`call-signature`、`class-get-accessor`、`class-index-signature`、`class-member-catch-all`、`class-set-accessor`、`class-static-block-declaration`、`construct-signature`、`constructor`、`get-accessor`、`index-signature`、`method-declaration`、`method-signature`、`parameter-list`、`property-declaration`、`property-signature`、`set-accessor`（均为 `-possible-shape.xl.md`）。

## 4. 验收

| 验收项 | 结果 |
|---|---|
| `xl_build`（core+typescript → ts） | **0 error**；16 written / 622 skipped；3 warning |
| `tsc -p .` | **exit 0**，零输出 |
| `node tmp/target-cases.mjs` | **29 ok / 1 fallback / 0 diff / 0 error**，`pin-miss=0` |
| `types/` 下 grep `source:PossibleSource` | 16/16 文件各 1 处，无遗漏、无重复 |
| 编码 | 16 个文件均 UTF-8 **无 BOM**、行尾 LF 未变（脚本校验 `bom=0 cr=0`） |

3 条 warning 全部是**改动前就存在**的 `E1107`（`class-*` 与裸名同名候选），非本次引入；因新增一行 import，行号由 18 顺移到 19。唯一的 fallback 是既有 `026-if-regex-test`（整条文件回退 legacy，回退后 AST 仍逐字一致），与本次改动无关。

## 5. 备注

候选正文不读 `source`（`types/` 无按来源分流的候选），按任务约定「不用则忽略」：形参收下即可，`tsconfig` 未开 `noUnusedParameters`，不产生告警。若后续某候选要区分来源，形参已在位，直接读即可。
