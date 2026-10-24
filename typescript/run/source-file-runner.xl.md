# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { SourceFileShape } from "../tokens/files/source-file-shape.xl.md"
import { TextDocument } from "./text-document.xl.md"
import { StatementRouteUtil } from "../tokens/statements/statement-route-util.xl.md"
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

文件级兜底（T1d r13 路线 A）：`StatementRoute.Legacy` 只是家族码、不等于 Wave1 路径（HANDOFF-s1d-r12 §3），
所以真兜底只能是**整条文件**按 `EnableShellExpressions = false` 的候选目录重解析。

- 开关 false：Wave1 原样一次解析，**永不**兜底，false 态逐字节不变。
- 开关 true 且 `EnableFileFallback = true`：先整条文件走新路径；**抛异常**时清掉现场（新模板 / 新根 / 新上下文，
  不复用任何形状或 token），按 legacy 目录重建一次；只重试一次，重试仍抛错就如实抛出。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableFileFallback) {
  StatementRouteUtil.LastFileFallback = false;
  return SourceFileRunner.ParseCore(text, filePath, StatementRouteUtil.EnableShellExpressions);
}
StatementRouteUtil.LastFileFallback = false;
try {
  return SourceFileRunner.ParseCore(text, filePath, true);
} catch (error) {
  StatementRouteUtil.FileFallbackCount = StatementRouteUtil.FileFallbackCount + 1;
  const root = SourceFileRunner.ParseCore(text, filePath, false);
  StatementRouteUtil.LastFileFallback = true;
  return root;
}
```

## static method ParseCore:(text:string, filePath:string, shell:bool)=>SourceFileShape

真正的装配：模板 → 根 → 上下文 → 跑一遍。`shell` 只决定**这一次**解析读哪套候选目录，
`finally` 里恢复，因此同一次 Parse 不会混用两套目录，也不会把状态漏给下一次。

```ts
const previous = StatementRouteUtil.EnableShellExpressions;
StatementRouteUtil.EnableShellExpressions = shell;
try {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 128);
  context.Process(new TextDocument(text, filePath));
  return root;
} finally {
  StatementRouteUtil.EnableShellExpressions = previous;
}
```
