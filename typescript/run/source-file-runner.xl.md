# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { SourceFileShape } from "../shapes/files/source-file-shape.xl.md"
import { TextDocument } from "./text-document.xl.md"
import { TypescriptTemplate } from "./typescript-template.xl.md"
```

# namespace cangjie

# class SourceFileRunner

## static method Parse:(text:string, filePath:string)=>SourceFileShape

```ts
return SourceFileRunner.ParseCore(text, filePath);
```

## static method ParseCore:(text:string, filePath:string)=>SourceFileShape

```ts
const template = TypescriptTemplate.Create();
const root = new SourceFileShape(template);
const context = new SyntaxContext(root, 128);
context.Process(new TextDocument(text, filePath));
return root;
```
