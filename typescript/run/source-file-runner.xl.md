# dependencies
```xl
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { SourceFileShape } from "../shapes/files/source-file-shape.xl.md"
import { TextDocument } from "./text-document.xl.md"
import { StatementRouteUtil } from "../shapes/statements/statement-route-util.xl.md"
import { TypescriptTemplate } from "./typescript-template.xl.md"
```

# namespace cangjie

# class SourceFileRunner

## static method Parse:(text:string, filePath:string)=>SourceFileShape

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

```ts
// shell=false 时两个增量开关一起压：只切 EnableShellExpressions 会让变量声明族 / 声明挂载 /
// 块体 / 控制流 / 表达式体继续读增量目录（D3b §3：第二跳复现同一条 CatalogGuide 异常）。
const previousShellExpressions = StatementRouteUtil.EnableShellExpressions;
const previousIncrementalVariableShapes = StatementRouteUtil.EnableIncrementalVariableShapes;
const previousIncrementalShapes = StatementRouteUtil.EnableIncrementalShapes;
StatementRouteUtil.EnableShellExpressions = shell;
if (!shell) {
  StatementRouteUtil.EnableIncrementalVariableShapes = false;
  StatementRouteUtil.EnableIncrementalShapes = false;
}
try {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 128);
  context.Process(new TextDocument(text, filePath));
  return root;
} finally {
  StatementRouteUtil.EnableShellExpressions = previousShellExpressions;
  StatementRouteUtil.EnableIncrementalVariableShapes = previousIncrementalVariableShapes;
  StatementRouteUtil.EnableIncrementalShapes = previousIncrementalShapes;
}
```
