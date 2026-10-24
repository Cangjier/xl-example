# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { SourceFileShape } from "../tokens/files/source-file-shape.xl.md"
import { StatementBlockStream } from "./statement-block-stream.xl.md"
import { TextDocument } from "./text-document.xl.md"
import { TypescriptTemplate } from "./typescript-template.xl.md"
```

# namespace cangjie

运行层：一次「源码文本 → 形状树」的执行。**它不是语言定义**，只是把语言的装置按顺序装起来、驱动一遍。

装配有三件事，全在这一处，别处不再重复：

- **模板**来自 `TypescriptTemplate.Create()`：basic 跳转队列与 ts 的字符串形态都在那里配好。
- **根单元**是 `SourceFileShape`，它自己的跳转队列在 `ShapeToken` 构造器里已经接上 basic 队列，这里只管 `new`。
- **上下文**只负责驱动：`SyntaxContext.Process` 逐位置喂字符，最后一个位置后给根签出，最后把根关掉。

# class SourceFileRunner

源文件运行器。

一个实例只跑一次：`Parse` 是静态方法，没有跨次状态。

## static method Parse:(text:string, filePath:string)=>SourceFileShape

把一段源码跑成根形状单元，返回它。

返回的是**形状树**（`SourceFileShape` 的 `Data` 里是语句形状），不是 AST——AST 由各形状自己的投影入口产出，见 `typescript/ast/`。

**窗口大小取 128（不是 core 默认的 32）。** 窗口只影响调度粒度、不影响解析结果（任一窗口大小的 XML 逐字节相同），
但在 run-batching 之后，basic token 的批处理（注释正文 / 空白段 / Common 正文）让成本集中到「每窗口一次」的入口上：
窗口 32 时 8 份 `.d.ts` 有 12.7 万个窗口，128 时只有约 3.2 万。同进程 A/B 实测 128 比 32 快 **7% ~ 9.5%**（8 份 d.ts），
全语料 4,497 文件 XML 逐字节等价、七道门全绿；整体口径（8 份 / 226 份与 TS 对照）见
`docs/opt-basic-token-gc-analysis.md`。这里显式传参而不改 core 默认值，是为了把「性能口径」留在运行层，
core 的 `SyntaxContext` 默认值仍是 32（其它语言的装配可以自选）。

**语句块的流式挂载点在这里装配**：`new SyntaxContext` 之后立刻把 `StatementBlockStream.Hook` 装到
`BracketHook` 上，`Process` 之前完成。装配的是「判定 + 挂载」，不是引擎：
钩子在 `Bracket.Transit` 建出 `{` 时判定它是不是语句块，是就给该括号设 `BatchAdapter`（动作与 WP-1 枚举体一致），
块内 item 由解析期自己的 `OnBasicTokenClosed` 就地建出（见 `statement-block-stream.xl.md`）。
判定不认的 `{`（对象 / 类型字面量、class / enum / interface / module 体）一个都不挂，行为回到基线。

```ts
const template = TypescriptTemplate.Create();
const root = new SourceFileShape(template);
const context = new SyntaxContext(root, 128);
context.BracketHook = StatementBlockStream.Hook;
context.Process(new TextDocument(text, filePath));
return root;
```
