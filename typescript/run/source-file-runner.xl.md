# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { SourceFileShape } from "../tokens/files/source-file-shape.xl.md"
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

```ts
const template = TypescriptTemplate.Create();
const root = new SourceFileShape(template);
const context = new SyntaxContext(root);
context.Process(new TextDocument(text, filePath));
return root;
```
