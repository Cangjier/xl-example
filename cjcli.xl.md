# dependencies
```xl
import { SyntaxContext } from "./core/syntax/syntax-context.xl.md"
import { SourceRange } from "./core/syntax/source-range.xl.md"
import { TextDocument } from "./typescript/run/text-document.xl.md"
import { TypescriptTemplate } from "./typescript/run/typescript-template.xl.md"
import { SourceFileShape } from "./typescript/tokens/files/source-file-shape.xl.md"
import { StatementRouteUtil } from "./typescript/tokens/statements/statement-route-util.xl.md"
```

# namespace cangjie

`cjcli`：命令行入口。**它不做「整篇一次解析」**：每吃一个字符，就把当前的 AST 行打一遍。

口径与 `docs/expected-token-time-shapes.md` 一致——同一份 `Token.ToAstLine(0)` 渲染器、同样的逐字符推进：
`let x = 2*3+1` 一共 14 步（13 个字符 + EOF），每步一节，与文档逐行相同。

| 命令 | 行为 |
| --- | --- |
| `cjcli <文件>` | 逐字符推进文件，每步打一次 AST 行 |
| `cjcli`（无参数） | 从标准输入读源码，同样逐字符推进 |

每步的输出形状（与 `tests/parse/token-time-shapes.mjs` 的 dump 相同，步与步之间空一行）：

```text
## [char 0] "l"
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="l"
```

**为什么不用 `SourceFileRunner`。** 它一次 `context.Process(document)` 吃完整篇、只给出最终那棵树；
逐字必须在外面自己驱动 `SyntaxContext.ProcessRange`——一次一个 `[i, i+1)` 窗口，吃完就把树打出来。
它里面的窗口大小（128）与文件级兜底重解析在这里也都不适用：逐字要的是每一步的中间态，重解析会把中间态覆盖掉。

**为什么打开 `EnableIncrementalVariableShapes`。** `docs/expected-token-time-shapes.md` 的预期形状是**增量形状树**
（char 5 起就是 `VariableStatementShape` 一层层长出来）。默认 legacy 路径的中间态是 `StatementShape`，与文档对不上；
所以入口在解析前把这个静态开关打开——它只改形状归属，不改渲染口径。

**EOF 也是一步。** `SyntaxContext.Process` 的尾巴是：游标压到 `count` → 根签出 → 把空窗口 `[count, count)` 交给根
→ 抽消息队列。循环结束后照做；最后那一下直接调 `ProcessRange`（它会在 `owner.Process` 之后自己 `DrainMessages`），
既复刻了这条尾巴，也不用从外部去碰 private 的 `DrainMessages`。

**参数只剩一个位置参数。** `-o` / `-h` / `-v` 与「写文件」一类选项全部移除：入口只有一个默认行为，
多余的参数一律当用法错误（退出码 `1`）。

**产物是自执行的。** 本文件末尾的 `# statement` 把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/ts/cjcli.js` 直接就是命令行工具：没有加载器、没有包装进程、没有第三方运行时。

整条链路上 xl 表达不了的只有 **shebang 一行**：产物前三行永远是 xl 的产物头，而 `tsc` 只认**文件第 1 行**的 `#!`
（写在别处直接 `TS18026`，tsc 还会把它编译成 `!/usr/bin / env;`）。那一行落在 `bin/cjcli.js`
（`#!/usr/bin/env node` + `require("../build/ts/cjcli.js")`），它不含任何逻辑。

# method Main:(args:Array<string>)=>void

命令行入口。

`process.argv` 的前两段是 node 与脚本路径、不算参数，所以 `# statement` 里先切掉它们，这里只拿用户参数。

读入失败与解析抛错都收敛到退出码 `1`。已经打出去的小节留在标准输出上——逐字 dump 本身就是诊断，
不会因为后面某一步抛错就把前面的中间态抹掉。

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

把一段源码按「一次一个字符」喂进解析器，每喂一格打一次树。

**窗口必须是一个字符**：`ProcessRange` 给的窗口就是这一次交给根的字符区间，`[index, index + 1)` 才是「只吃这一个字符」。
窗口开大就等于跳过中间态——那正是这个入口要的东西。

**文档登记要提前做**：`SourceRange.CurrentDocument` / `context.CurrentDocument` 是 token 封口时找文档的兜底
（`SyntaxContext.Process` 开头也会登记）。`ProcessRange` 每一步会按窗口里的文档重设，但空文档（`count == 0`）
一步都不跑，EOF 收尾之前需要它还在，所以这里显式登记一次。

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

打一步：小节标题 + 当前整棵树的 AST 行。

标题取 `## [char N] "c"`——字符用 `JSON.stringify` 转义，空格、换行才不会看混；EOF 那步没有字符，标题就是 `## [EOF]`。
小节前空一行，整份输出因此可以直接与 `docs/expected-token-time-shapes.md` 的小节并排看。

```ts
const heading = quoted === null ? "## [" + label + "]" : "## [" + label + "] " + quoted;
process.stdout.write("\n" + heading + "\n" + tree + "\n");
```

# method CjcliReadSource:(path:string)=>string

读源码：给了路径就整段读文件，没给就从标准输入读满。

文件描述符 `0` 就是 stdin，`readFileSync(0, "utf8")` 会一直读到 EOF——`echo "…" | cjcli` 因此能用。
路径只在 `TextDocument` 里当诊断用的 `filePath`，这里不改写它。

**BOM 不在这里摘。** core 的 `Bom` basic token 在任何位置都把 BOM 当 trivia 认领
（`core/syntax/basic-tokens/bom.xl.md`）；逐字口径下它本来就是单独的一步，手工剥掉反而少一格。

```ts
if (path === "") {
  return CjcliHost.Fs().readFileSync(0, "utf8");
}
return CjcliHost.Fs().readFileSync(path, "utf8");
```

# method CjcliErrorText:(error:any)=>string

把抛出来的东西转成一行文本。

`catch` 到的可能是 `SyntaxException`（诊断在 `Message` 里）、原生 `Error`（`message`），也可能是任何别的东西。
直接 `String(error)` 对普通对象会得到 `[object Object]`，这里按可用字段依次降级。

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

运行环境：入口只用得到 Node 的 `fs`。

**为什么不直接写模块级 `import { readFileSync } from "node:fs"`。** 顶层 `import` 会被提升到产物文件开头、
插到 xl 的产物头前面，破坏产物头的可校验性。`process.getBuiltinModule()` 是运行时调用，不会被提升。

**为什么是静态工厂方法而不是静态字段。** 字段类型得写成 `typeof import("node:fs")`，而 xl 的类型标注（`E1204`）
不接受 `typeof` / `import(...)` 这种写法；方法让类型标注留在 ts 体里、由 tsc 自己推，方法签名只用 xl 已知的 `any`。

## static method Fs:()=>any

文件系统模块。

`process.getBuiltinModule` 是 Node 22.3 起提供的同步取内建模块的入口；调用点只在运行时发生，产物里不会多出顶层语句。

```ts
return process.getBuiltinModule("node:fs") as typeof import("node:fs");
```

# statement

启动：把命令行参数交给 `Main`。

`# statement` 的围栏内容会被**原样**搬进产物，而且**不带 `export`、不包函数**——这正是 `dist/ts/cjcli.ts` 自执行的原因。
位置规则只有两条：`# statement` 与 `# namespace` 谁先谁后都行（`Main` 的前向引用靠函数提升活着），
但模块级声明必须排在 `# class` 之前（`E1005`），所以它落在文件末尾。

`process.argv.slice(2)`：`[0]` 是 node、`[1]` 是脚本路径，其余才是用户参数。

```ts
Main(process.argv.slice(2));
```
