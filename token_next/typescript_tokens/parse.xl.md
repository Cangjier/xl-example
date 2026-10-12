# dependencies
```xl
import { SyntaxContext } from "../core/context.xl.md"
import { Document, Source } from "../core/source.xl.md"
import { Token } from "../core/token.xl.md"
import { CloseChain } from "../core/lexeme.xl.md"
import { SourceFileShape } from "./shapes/source-file-shape.xl.md"
import { TypeScriptToken } from "./typescript-token.xl.md"
```

# namespace cangjie

**入口**：装配 → 逐字符驱动 → 收口 → 报告。

驱动这一层只有三句话：

1. **装配**（`LanguageToken.Assemble`）：造一份模板，语言层把自己的表写进去；
2. **逐字符**：`root.Process(context, source)`，返回 `false` = 这个字符**没有任何单元认领**——
   那是要记账的事，不许悄悄丢掉；
3. **收口**：`root.Finish(context, source)` 把「构造结束」事件传下去（§5 第二种失败就在那一趟里判）。

# class ParseReport

一次解析的产物与账。

## field Xml:string = ""

紧凑单行形态的产物树。

## field Formatted:string = ""

缩进形态的产物树（给人看的）。

## field Notes:string = ""

账（收敛失败、没认领的字符）；没有账就是空串。

## field ProductCount:int = 0

产物里有多少格（`InProduct` 答真的单元：词法单元与形状都算）。

## field NoteCount:int = 0

账的条数。

## field DroppedCount:int = 0

没有任何单元认领的字符个数（正常输入应当是 **0**）。

# method Parse:(text:string)=>ParseReport

解析一份 TypeScript 源码，返回产物树与账。

```ts
const language = new TypeScriptToken();
const template = language.Assemble();
const document = new Document(text);
const context = new SyntaxContext(document);
const source = document.CreateSource();
const root = new SourceFileShape(template);
const report = new ParseReport();
while (source.Next()) {
  const consumed = root.Process(context, source);
  if (!consumed) {
    report.DroppedCount = report.DroppedCount + 1;
    context.Note("没有任何单元认领这个字符：" + source.Value + " @" + source.Index);
  }
}
source.Rewind();
CloseChain(root, context, source);
root.Finish(context, source);
root.Start = 0;
root.End = source.Length() - 1;
report.Xml = root.ToXmlString();
report.Formatted = root.FormatXml();
report.Notes = context.Report();
report.NoteCount = context.Notes.length;
report.ProductCount = CountProducts(root);
return report;
```

# method CountProducts:(unit:Token)=>int

数一数产物里有多少格（用显式栈走，不递归——树的深度由输入决定）。

判据是**每一格自己的声明**（`InProduct`），不是类名后缀——向导答 `false`，所以它就算被误收进树也不会被算成一格。

```ts
let count = 0;
const stack: Token[] = [unit];
while (stack.length > 0) {
  const item = stack.pop();
  if (item === undefined) continue;
  if (item.InProduct()) count = count + 1;
  for (let i = 0; i < item.Data.length; i++) stack.push(item.Data[i]);
}
return count;
```
