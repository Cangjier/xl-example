# dependencies
```xl
import { SyntaxContext } from "./core/syntax/syntax-context.xl.md"
import { SourceRange } from "./core/syntax/source-range.xl.md"
import { TextDocument } from "./typescript/run/text-document.xl.md"
import { TypescriptTemplate } from "./typescript/run/typescript-template.xl.md"
import { SourceFileShape } from "./typescript/shapes/files/source-file-shape.xl.md"
import { StatementRouteUtil } from "./typescript/shapes/statements/statement-route-util.xl.md"
```

# namespace cangjie

```text
## [char 0] "l"
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="l"
```

# method Main:(args:Array<string>)=>void

```ts
if (args.length > 1) {
  process.stderr.write("cjcli: 只接受一个输入文件\n");
  process.exitCode = 1;
  return;
}
const input = args.length === 0 ? "" : args[0];
let content: string;
try {
  content = CjcliReadSource(input);
} catch (error) {
  process.stderr.write("cjcli: 读取输入失败：" + CjcliErrorText(error) + "\n");
  process.exitCode = 1;
  return;
}
try {
  CjcliPrintTimeShapes(content, input);
} catch (error) {
  process.stderr.write("cjcli: 解析失败：" + CjcliErrorText(error) + "\n");
  process.exitCode = 1;
}
```

# method CjcliPrintTimeShapes:(content:string, filePath:string)=>void

```ts
StatementRouteUtil.EnableIncrementalVariableShapes = true;
const template = TypescriptTemplate.Create();
const root = new SourceFileShape(template);
const context = new SyntaxContext(root, 32);
const document = new TextDocument(content, filePath);
SourceRange.CurrentDocument = document;
context.CurrentDocument = document;
const count = document.GetCount();
for (let index = 0; index < count; index++) {
  context.ProcessRange(context.Root, new SourceRange(document, index, index + 1), index);
  CjcliPrintStep("char " + String(index), JSON.stringify(content[index]), root.ToAstLine(0));
}
context.Index = count;
context.Root.SignOut(count);
context.ProcessRange(context.Root, new SourceRange(document, count, count), count);
CjcliPrintStep("EOF", null, root.ToAstLine(0));
```

# method CjcliPrintStep:(label:string, quoted:string | null, tree:string)=>void

```ts
const heading = quoted === null ? "## [" + label + "]" : "## [" + label + "] " + quoted;
process.stdout.write("\n" + heading + "\n" + tree + "\n");
```

# method CjcliReadSource:(path:string)=>string

```ts
if (path === "") {
  return CjcliHost.Fs().readFileSync(0, "utf8");
}
return CjcliHost.Fs().readFileSync(path, "utf8");
```

# method CjcliErrorText:(error:any)=>string

```ts
if (error !== null && error !== undefined && typeof error === "object") {
  const detail = (error as any).Message ?? (error as any).message;
  if (detail !== null && detail !== undefined) {
    return String(detail);
  }
}
return String(error);
```

# class CjcliHost

## static method Fs:()=>any

```ts
return process.getBuiltinModule("node:fs") as typeof import("node:fs");
```

# statement

```ts
Main(process.argv.slice(2));
```
