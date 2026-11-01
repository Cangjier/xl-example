# cj-ts-case-fix

DSH 插件：注册一个工具 `case_fix`，把「按 `.infer` 修实现」这件事**编排成任务交给 DSH**，
并在事后做**独立验收**。

插件自己**不改实现代码**（除了 `regen` 会重写 `.infer`）：它算缺口、找实现文件、写任务书、
查安全边界、构建、跑门禁、对拍、调 `code_review`。真正改 `.xl.md` 的是 DSH 用它自己的
编辑工具完成的——这样改动能被审阅、被回滚，也不会把「模型改代码」这件事藏进插件里。

## 三个动作

| 动作 | 做什么 | 写盘 | 调模型 |
| --- | --- | --- | --- |
| `plan`（默认） | 读 `.infer` 算缺口，找定义/构造文件，输出任务书（可 `taskPath` 落盘） | 只在给了 `taskPath` 时写那份 Markdown | 不调 |
| `verify` | git 边界 → 构建 → 门禁 → 逐用例对拍 → `code_review` | 不写源码（构建产物除外） | 只有审查用 |
| `regen` | 构建/门禁通过后，调 `case_infer` 重新判定 `.infer`（覆盖 llm 列），再走 `verify` | 重写 `.infer` | 用（每例 `runs` 次） |

```text
case_fix
  action   plan / verify / regen（默认 plan）
  case     一个用例：id（相对 typescript/cases/tts）、.ts 路径或 .infer 路径
  dir      一个目录：处理其中所有带 .infer 的 .ts，最多 maxCases 个
  only     只算哪些状态：late / early / no-created / no-shape / all（默认全部）
  kinds    只算这些 kind，如 ["TypeParameter"]（默认全部）
  include  plan：强制随附的 .xl.md（相对仓库根）
  taskPath plan：把任务书写到这里（相对仓库根）；写了就是自包含版本
  inlineContext plan：把实现文件正文与 IMPORTANCE 全文也放进返回值（默认 false，只给路径与行段）
  runs     regen：判定几次，默认 3（调 1 省调用）
  decisions regen：把有分歧的节点定下来 { "<Kind|pos|start>": char }，只能配单个 case
  maxCases 目录模式上限，默认 8
  review   verify/regen：是否跑 code_review，默认 true
  failOn   审查门槛：P0 / P1 / P2 / P3 / any，默认 P0
```

`case` 与 `dir` 必须给且只给一个。

## 安全边界（越界即整体失败）

`case_fix` 的边界是写死的，不随配置放宽：

- **`core/**` 一律禁止修改**（用户明确要求）；
- `typescript/cases` 下的 `.ts`（用例）不可改——用例是规格，不是实现；
- `docs/IMPORTANCE.md` 只能由用户编辑；
- `.xl.md` 只能改 `editable` 里的（默认 `typescript/shapes`）；
- `.infer` 不算越界（它是可重新判定的派生数据），但会在结果里单列（`boundary.infers`）。

`verify` / `regen` 用 `git status --porcelain=v1 -z` 读工作区，任何一条越界都直接失败，
**不会**先构建再告诉你。`plan` 也会把当前工作区的越界情况写进任务书开头。

`editable` 里写 `core`、`typescript/cases`、`docs` 会在配置归一化时直接报错——不是「过滤掉」，
是让一个越界的配置根本起不来。

## `plan` 任务书里有什么

- 安全边界（可写 / 禁止）与当前工作区的越界提醒；
- 每个用例：源码 + 逐字表（`⏎` 是换行）、每个目标节点的 `status / llm / created / 节点 id /
  .infer 原文 / 定义文件 / 怎么改`，以及缺口方向（`late` = llm 比 created 晚，要把创建往后挪）；
- 实现上下文：定义文件、`new XShape` / `XShape.From` 的构造处、其余提及文件。默认**只给路径
  与相关行段**（DSH 的 `read` 比把 40KB 正文塞进返回值更省、也更准）；`inlineContext: true`
  或给了 `taskPath` 时才是自包含的全文版本（大文件按 `excerptLines` 切片段，片段都是原文的连续切片）；
- `docs/IMPORTANCE.md`：默认只给路径（用 `read` 打开），自包含版本里是全文；
- 验收标准与下一步的工具调用（`verify` / `regen`）。

返回值里还带一份结构化版本（`cases[].targets` / `files` / `definitions`），方便程序化使用。
`taskPath` 适合大任务：把长任务书落成文件，DSH 分几次读也不会丢上下文。

## 上下文怎么找

1. `# class <Kind>Shape` 的定义文件；
2. 真的建出这颗形状的地方：`new <Kind>Shape` 与 `<Kind>Shape.From...`；
3. 只是提到 `<Kind>Shape` 的文件，按相关度排序。

大文件（`type-parser.xl.md` 有 51KB）只给相关片段：以 kind 名字为锚，前后各留
`excerptLines/2` 行，多个窗口合并，窗口之间插一行 `…（省略 N 行）…`。预算是
`maxContextBytes`，超出的文件列进「没有随附的文件」，不静默截断。

## `verify` 的判据

按优先级给第一个失败项（`status`）：

```text
boundary-failed      改动碰了 core / 用例 / IMPORTANCE / 可写范围之外的 .xl.md
build-failed         xl_build 或 tsc 失败
gate-failed          typescript/cases/tts/run.mjs 不全绿（改坏了别的用例）
regen-unavailable    regen 时拿不到 case_infer 实现
needs-decision       regen 后有节点分歧（-> llm ?），要 decisions
regen-failed         regen 本身报错（模型输出不合格等）
measure-failed       build/ts 读不出来
needs-infer          .infer 还有 -> llm ?（默认过滤下）
gaps                 还有缺口没修完
review-failed        code_review 在 failOn 及更高级别有 finding
pass                 以上都没有
```

`ok` 只在 `pass` 时为 true。`review` 只审这次 `git status` 里改过的、可写范围内的 `.xl.md`；
没有改动就跳过审查并说明原因。

`late` / `early` 的方向按 `case-infer.mjs` 的 `delta = llm - created`：
`late +N` 是 llm 比 created 晚 N 格（模型要求更晚建），`early -N` 相反。

## `regen` 什么时候用

- **怀疑 `.infer` 本身**（模型口径偏差、`-> llm ?`、上次生成之后实现又改过）：先 `regen` 重判，
  再按新任务书修；
- **修完之后**：用一次全新的判定复核「现在的实现是否真的落在判定格上」。注意它会**覆盖**
  `.infer` 的 llm 列，所以这是一次「换一份新规格」的动作，不是只读检查。

顺序是：边界 → 构建 → 门禁 → 重新判定 → 用新 `.infer` 对拍 → 审查。判定有分歧时
`case_infer` 会写 `-> llm ?` 并把节点放进 `pending`，`case_fix` 原样报 `needs-decision`，
不替用户选；用 `decisions` 定下来即可（这次不调用模型）。

`regen` 每例调 `runs` 次模型（默认 3）。目录模式 8 个用例就是 24 次调用——先用 `case` 或
`kinds` / `only` 收窄。

## 配置

`cordis.patch.yml` 里插了一行，全部可省略：

```yaml
- insert:
    - id: case-fix
      name: 'cj-ts-case-fix'
      config:
        root: null              # 留空 = 从插件位置推（typescript/tools/cj-ts-case-fix 上三级）
        provider: null          # 留空 = 跟随界面上的默认模型（只有 regen 用）
        model: null
        maxTokens: 8192         # regen 调 case_infer 的输出上限
        timeoutMs: 180000
        retries: 1
        runs: 3                 # regen 每例判定几次
        maxCases: 8             # 目录模式上限
        editable: [typescript/shapes]   # 唯一可写范围；core / 用例 / docs 加不进来
        maxContextFiles: 6
        maxContextBytes: 80000
        maxFileBytes: 24000
        excerptLines: 80
        maxRulesBytes: 16000
        buildCommand: null      # 留空 = xl_build 工具 + 仓库自己的 tsc
        gate: true              # 构建后跑 tts:cases
        boundary: true          # git 工作区边界检查
        review: true
        failOn: P0
```

## 构建通道

`verify` / `regen` 要读 `build/ts`，所以必须重新生成 `dist/ts` 再 `tsc`：

1. 宿主里注册了 `xl_build`（`xl` 插件就在每个正式 profile 里）→ `xl_build { targets: ["ts"] }`
   再 `node node_modules/typescript/bin/tsc -p .`；
2. 没有 `xl_build` 但配置了 `buildCommand` → 原样执行（例如 `npm run build`）。

两条都没有就**报错**，不静默跳过：跳过构建 = 对拍永远看旧实现，验收会骗人。

## 对拍通道

对拍（`shape-actual.mjs`）有两条通道，按「本进程里的模块还能不能代表磁盘」选：

| 通道 | 什么时候走 | 代价 |
| --- | --- | --- |
| 进程内 `channel: "process"` | 本进程载入 `build/ts` 之后磁盘没变过 | 毫秒级 |
| 子进程 `channel: "child"` | 调用方给了 `fresh: true`（`case_fix` 的对拍一直给），或本进程载入之后 `build/ts` 变过 | 约 150ms |

子进程通道是**兜底**：宿主进程会把自己 `require` 过的 `build/ts` 模块一直留在内存里，删
`require.cache` 在 DSH 插件宿主里也换不回来——于是构建成功、门禁全绿，验收却一直量旧实现
（2026-11-01 在 `alias-conditional-infer` 上真撞到过）。子进程每次都新起一个 `node` 读磁盘上的
当前实现，因此 `case_fix` 的读数不再受宿主缓存影响；`freshness` 由 `build/ts` 整棵树的
`路径 + 大小 + mtime` 指纹判定，构造上只会偏保守（宁可起子进程），不会把旧模块当成新的。
回归测试见 `tests/measure-channel.test.mjs`。

## 实测（2026-11-01，装成插件后在 DSH 里跑）

```text
case_fix { action: "plan", case: "success/types/alias-array" }
→ 3 个目标，0 次模型调用：
    late +2      TypeAliasDeclaration pos=0  llm=8   现 6
    no-created   ArrayType           pos=8  llm=16  现 ?
    no-created   StringKeyword       pos=8  llm=15  现 ?
  随附：type-alias-declaration-shape、type-node-shapes、keyword-type-shapes、
        type-alias-possible-shape、type-conditional-chain、type-parser
```

```text
case_fix { action: "verify", case: "success/types/alias-array" }
→ 不通过（status=gaps）
  边界 ok（4 个改动）；构建 ok（xl_build 202ms，tsc 1900ms）；门禁 ok
  还差 3 行：TypeAliasDeclaration created=6 → llm=8、ArrayType ? → 16、StringKeyword ? → 15
  审查：没跑（没有改过可写范围内的实现文件）
```

```text
case_fix { action: "regen", case: "success/controls/let-binding-only", runs: 1 }
→ 通过：边界 ok、构建 ok、门禁 ok；1 次模型调用重新判定，.infer 重写后一致 5/5
```

构建通道实测（`xl_build` + `tsc`）：`tsc` 约 2s，`tts:cases` 门禁 182/182 约 1s。

## 安装

```bash
dsh_plugins install C:/Users/Admin/Documents/GitHub/xl-example/typescript/tools/cj-ts-case-fix
```

装好后工具名 `case_fix`。插件依赖仓库里的 `typescript/tools/case-infer.mjs`、
`shape-actual.mjs`、`typescript/cases/tts/run.mjs`，以及跑过一次 `npm run build`
（`build/ts` 存在）。改完插件自己的代码不用重启 DSH：`dsh_plugins disable` + `enable` 同一个
bundle。改到 `shape-actual.mjs` 这类**共享模块**或 `build/ts` 时不行——已载入的模块实例在宿主进程
里换不掉（对拍本身现在走子进程，不受影响；但插件自己 import 的那份 `shape-actual.mjs` 仍是旧实例），
需要重启宿主才彻底生效。

审查优先用已注册的 `code_review`（`cj-ts-code-review` 插件）；重新判定优先用已注册的
`case_infer`（`cj-ts-case-infer` 插件）。两者都没装也能跑——插件会 import 仓库里的同一份实现，
口径一致。

## 测试

```bash
node --test "typescript/tools/cj-ts-case-fix/tests/*.test.mjs"
# 仓库根：npm run fix:test
```

假边界 / 假构建 / 假对拍 / 假审查 / 假重判定，真的配置、用例解析、任务书与编排：

- `core` / `typescript/cases` / `docs` 写进 `editable` 必须被配置层拒绝；
- 任务书包含缺口方向、上下文、边界、验收与下一步，并可按 `taskPath` 落盘；
- `verify` 的每条分支（`pass` / `gaps` / `boundary-failed` / `build-failed` / `gate-failed` /
  `review-failed`），越界时**不会**先去构建；
- `regen` 的顺序是「构建 → 门禁 → 重新判定 → 对拍」，`needs-decision` 如实上报，
  `decisions` 只允许配单个 case；
- 审查的 tool / sibling 两条路都走同一份实现；
- 真仓库 `plan`：0 次模型调用、不写源码、时间与边界都正确。

## 已知边界

- `.infer` 只覆盖 168/182 个 success 用例（14 个嵌套同类二元表达式没有可表达的身份）；
  目录模式会把没有 `.infer` 的用例列进 `skipped`，不会当成功。
- 一个用例的缺口可能跨多个文件。任务书默认最多随附 6 个文件；不够时用 `include` 点名，
  或用 `kinds` / `only` 收窄。
- `verify` 只认「这次 `git status` 里改过的文件」。如果 DSH 把改动 `git add` 了、或在
  detached 状态之外提交了，请在 `verify` 前保持工作区可见（默认的 ` M` / `??` 都算）。
- `regen` 会覆盖 `.infer` 的 llm 列——这是它的用途，但也意味着「重新判定」会丢掉上一份判定。
  想留档就先 `git stash` / 复制一份，或先跑 `plan` 把旧判定记在任务书里。
