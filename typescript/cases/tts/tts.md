# tts 用例

这一组用例回答同一个问题：**解析器逐字符推进得到的 AST，是否与 TypeScript 的语义 AST 逐节点一致**（节点类型、pos、end、标识符/字面量文本）。

## 文件约定

| 文件 | 内容 |
| --- | --- |
| `xxx.ts` | 用例源码 |
| `xxx.ast` | `typescript/tools/ts-ast-line.mjs` 的输出，即 TypeScript AST 的期望 |
| `xxx.md` | 逐字符 token 树（`Token.ToAstLine`）：每个字符一步，最后一步是 EOF |

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
