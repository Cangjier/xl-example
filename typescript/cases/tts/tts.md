# tts 用例

这一组用例回答同一个问题：**解析器逐字符推进得到的 AST，是否与 TypeScript 的语义 AST 逐节点一致**（节点类型、pos、end、标识符/字面量文本）。

## 文件约定

| 文件 | 内容 |
| --- | --- |
| `xxx.ts` | 用例源码 |
| `xxx.ast` | `typescript/tools/ts-ast-line.mjs` 的输出，即 TypeScript AST 的期望 |
| `xxx.md` | 逐字符 token 树（`Token.ToAstLine`）：每个字符一步，最后一步是 EOF |
| `xxx.infer` | 可选：每个形状的 `created at`（shape token 创建格）与 `llm determined`（模型判定的确定格），见下节 |

- `success/`：已经逐节点一致的用例，是门禁的一部分。
- `todo/`：尚未支持的用例。目录名就是缺口类别（`statements` / `expressions` / `declarations` / `types` / `lexical` / `composite`），
  新支持一个构造就把用例移进 `success/`，并用下面的生成器补 `.md` / `.ast`。
- `todo/adaptation-plan.md`：按难度排的适配计划（三个最难的层 + 13 个里程碑 + 每阶段的转绿判据）。
- `index.md`：覆盖统计，由 `npm run tts:cases:index` 重写（数字来自对拍，不手写）。

## 跑法

```bash
npm run compile          # *.xl.md → dist/ts → build/ts
npm run tts:cases        # 只跑 success/：必须全绿（当前 139/139），exit 0
npm run tts:cases -- --all --list     # success/ + todo/，并打印通过清单
npm run tts:cases:index  # todo/ 未支持清单也计入，重写 index.md
npm run tts:report       # todo/ 的失败形态分类：缺树/仅 end/抛错 + 首缺节点 + 首个阻断构造
node typescript/cases/tts/run.mjs typescript/cases/tts/todo/incremental/statements/while-block.ts
```

`run.mjs` 除了对拍解析器与 TypeScript，还会检查 `success/**/*.ast` 是否与 `ts-ast-line` 的当前输出一致——
`.md` 里的逐字符树是同一套形状树的快照，夹具过期同样算失败。

## 在浏览器里看

```bash
npm run tts:view         # → http://127.0.0.1:7799/
```

逐个用例看 `case.ts` / `case.ast`，并按 `case.md` 的逐字符树自动回放；没有 `.md` 的用例用
`build/ts` 实时推进（不写盘），需要落成快照时页面上可以直接生成并写入 `.md` / `.ast`。
工具源码在 `typescript/tools/cases-viewer/`。

## 生成 `.md` / `.ast`

`typescript/tools/gen-case-docs.mjs` 用与 `cjcli` 相同的驱动逐字符推进并调用 `ToAstLine`：

```bash
node typescript/tools/gen-case-docs.mjs typescript/cases/tts/success/statements/while-block.ts
```

## `xxx.infer`：形状的 created at 与 llm determined

`xxx.ast` 只说最终树长什么样，不说「每个形状在哪一格被建出来、又在哪一格就该确定」。`xxx.infer` 补的就是这两列：
开头是用 `ts` 围栏包住的用例源码和逐字编号表，后面是与 `.ast` 同形的树；每行末尾的上下文用
`【x:N】` 标出位置——N 是 `created at`。两个位置不同时，再跟一段 `-> llm "…【x:M】…"`：

```text
// "let x【x:5】= 1"                            相同：只写一个上下文
// "let x【x:8】= 1" -> llm "let【x:5】x = 1"    不同：再写模型的判定
// "let x【x:5】= 1" -> llm ?                   模型还没判
// ? -> llm "let【x:5】x = 1"                   还没有 CreatedAt
```

- `created at`：`ShapeToken.CreatedAt`，possible / end 的 build（含类型参数表 / 实参表的收口）
  建出这颗形状的那一格。根 `SourceFile` 在第一个字符之前就存在，记 `【x:0】`；落在 EOF 那一格时
  记 `【x:<字符总数>】`；还没写 create 入口的形状整行位置记 `?`。
- `llm determined`：模型按语法逻辑判定的「最早能确定」位置，不看解析器；还没判定时箭头后面记 `?`。
- 上下文是标记位置前后各至少 5 个字符，`【x:N】` 标出该位置；片段里的 `"` / `\` 会转义。

判定是模型的活，脚本只做机械的事：

```bash
node typescript/tools/case-infer.mjs <xxx.ts>             # 骨架：ts 源码块 + 逐字表 + 树（created at 已填，llm 为 ?）
node typescript/tools/case-infer.mjs --format <xxx.ts>    # 规范化：补两个位置的上下文、旧表头换成 ts 源码块
node typescript/tools/case-infer.mjs --check <xxx.ts>     # llm determined vs created at，有差异 exit 1
```

- 骨架默认不覆盖已有 `.infer`，要重来加 `--force`。
- 骨架和 `--check` / `--format` 都要读 `build/ts`（先 `npm run build`），因为 `created at` 只能从 shape token 取。
- 也可以让宿主模型来判定：DSH 插件 `typescript/tools/dsh-case-infer` 注册了 `case_infer`，
  用当前默认模型生成并立刻对拍（`npm run infer:test` 是它的离线测试）。
- `--check` 的状态：`ok` / `late +N`（模型判得比实际创建晚 N 格）/ `early -N` / `unfilled`（llm 还是 `?`）/
  `no-created`（shape token 还没记 CreatedAt）/ `no-shape`（树里没有这个节点）/ `stale`（`.infer` 里的节点 `.ast` 没有）。
  它不修任何东西，只把差异列出来。
- 节点身份是 `kind + pos + src 起点`：形状会长大（`src` 的右边界会变），所以 `end` 不参与对齐。
- 2026-10-31 的全量生成与缺口 review（success/ 167 份 `.infer`、42 个实现侧信号、14 个身份冲突用例）见
  [infer-review.md](infer-review.md)。
