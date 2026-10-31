# tts 用例

这一组用例回答同一个问题：**解析器逐字符推进得到的 AST，是否与 TypeScript 的语义 AST 逐节点一致**（节点类型、pos、end、标识符/字面量文本）。

## 文件约定

| 文件 | 内容 |
| --- | --- |
| `xxx.ts` | 用例源码 |
| `xxx.ast` | `typescript/tools/ts-ast-line.mjs` 的输出，即 TypeScript AST 的期望 |
| `xxx.md` | 逐字符 token 树（`Token.ToAstLine`）：每个字符一步，最后一步是 EOF |
| `xxx.infer` | 可选：LLM 按语法逻辑判定的「每个形状最早在哪一格确定」，见下节 |

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

## `xxx.infer`：期望的形状创建位置

`xxx.ast` 只说最终树长什么样，不说「每个形状应该在哪个字符被建出来」。`xxx.infer` 补的就是这一列：
与 `.ast` 同形的树，每行末尾 `// char N "…"`，表示这个形状**最早在第 N 格就能确定**——
`…` 是标记字符前后各至少 5 个字符的上下文，`【】` 标出该字符（空格 `␣`、换行 `⏎`）。

判定是模型的活（从语法逻辑推，不看解析器），脚本只做三件机械的事：

```bash
node typescript/tools/case-infer.mjs <xxx.ts>             # 生成骨架：表头 + .ast 树 + 每行 // char ?
node typescript/tools/case-infer.mjs --format <xxx.ts>    # 规范化：// char N → // char N "上下文"
node typescript/tools/case-infer.mjs --check <xxx.ts>     # 期望 vs 实际（build/ts 逐字推进），有差异 exit 1
```

- 骨架默认不覆盖已有 `.infer`，要重来加 `--force`。
- 也可以让宿主模型来判定：DSH 插件 `typescript/tools/dsh-case-infer` 注册了 `case_infer`，
  用当前默认模型生成并立刻对拍（`npm run infer:test` 是它的离线测试）。
- `--check` 的状态：`ok` / `late +N` / `early -N` / `unfilled`（还是 `?`）/ `no-shape`（树里始终没这个节点）/ `stale`（`.infer` 里的节点 `.ast` 没有）。
  它不修任何东西，只把差异列出来——`late +N` 就是「这个形状本可以早 N 格建、但实现拖到了后面」。
- 节点身份是 `kind + pos + src 起点`：形状会长大（`src` 的右边界会变），所以 `end` 不参与对齐。
- 2026-10-31 的全量生成与缺口 review（success/ 167 份 `.infer`、42 个实现侧信号、14 个身份冲突用例）见
  [infer-review.md](infer-review.md)。
