# dependencies
```xl
import { CommonUtil } from "./core/common-util.xl.md"
import { Token } from "./core/syntax/token.xl.md"
import { Template } from "./core/syntax/templates/template.xl.md"
import { SyntaxException } from "./core/exceptions/syntax-exception.xl.md"
import { TextDocument } from "./typescript/text-document.xl.md"
import { TextContext } from "./typescript/text-context.xl.md"
import { projectRoot, ToJsonText } from "./typescript/print-ast-common.xl.md"
```

# namespace cangjie

`cjcli`：命令行入口。**本文件不属于语法层本体**：它把 token 树接上命令行——
`typescript/tokens` 这棵 token 树因此真正能被调用。

链路只有四步：读源文件 → `TextDocument` 包成文档 → `TextContext.Process` 驱动解析 → 把 `Root` 的 XML 缩进后打到标准输出。

**三个出口**：XML 是默认出口（给人读，也是测试夹具的形态）；`--ast-json` 换成 JSON 出口
（给下游程序读，形状是上游 Cangjie 的 `Token.ToDictionary` / `Token.ToList`）；
`--ts-ast` 换成 **TS 形状出口**（`ts.createSourceFile` 的形状：kind 用名字、每个节点带
`pos` / `end` 与 TS 那边的字段名，给 `cases:tsast` 的对拍与人工 diff 用）。
JSON 出口**不再缩进 XML、也不做任何重排**，`JSON.stringify` 的紧凑单行就是它的形态——
缩进只属于 XML 那一条打印路径（`FormatXml` 也不认得 JSON）。

**三个出口同源**：都挂在同一次 `Process` 造出来的那棵树上（`CjcliParse`），
区别只在最后取哪一份——`Root.ToXmlString()` / `Root.ToJsonString()` /
`Root.ToList()` 交给 `projectRoot` 投影。**没有第二条解析路径**。

| 命令 | 行为 |
| --- | --- |
| `cjcli <文件>` | 解析文件，**缩进** XML 打到标准输出 |
| `cjcli <文件> -o <文件>` | 解析后写入指定文件（同一份缩进文本） |
| `cjcli <文件> --ast-json` | 解析后把 **AST JSON**（单行）打到标准输出 |
| `cjcli <文件> --ast-json -o <文件>` | 解析后把 AST JSON 写入指定文件 |
| `cjcli <文件> --ts-ast` | 解析后把 **TS 形状 JSON**（单行，`ts.createSourceFile` 的形状）打到标准输出 |
| `cjcli <文件> --ts-ast -o <文件>` | 解析后把 TS 形状 JSON 写入指定文件 |
| `cjcli -h` / `cjcli --help` | 打印用法 |
| `cjcli -v` / `cjcli --version` | 打印版本 |
| `cjcli`（无参数） | 从标准输入读，解析后打缩进 XML |

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

依赖路径的写法：`# dependencies` 里的 import 既决定 ts 产物里的 import，也决定「被依赖的规范文件」必须存在。
本项目根目录下的入口写 `./core/...`、`./typescript/...`，产物里就是 `./core/syntax/token` 这类**相对 `dist/` 根**的路径。

**产物链路**：

```
cjcli.xl.md  --xl build-->  dist/cjcli.ts  --tsc-->  build/cjcli.js  --node-->  运行
```

`dist/cjcli.ts` 是**自执行**的：本文件末尾的 `# statement` 把 `Main(process.argv.slice(2))` 原样写进产物。
所以没有加载器、没有包装进程、没有第三方运行时；`node build/cjcli.js` 就是 `cjcli`。

整条链路上 xl 表达不了的只有 **shebang 一行**：产物前三行永远是 xl 的产物头，
而 `tsc` 只认**文件第 1 行**的 `#!`（写在别处直接 `TS18026`，tsc 还会把它编译成 `!/usr/bin / env;`）。
那一行落在 `bin/cjcli.js`（`#!/usr/bin/env node` + `require("../build/cjcli.js")`），它不含任何逻辑。

关于本文件的骨架，有三处被 xl 的语法逼出来的写法，都不是风格选择：

1. **执行语句只能靠 `# statement`。** `# namespace` 正文里的代码块不进产物，方法体只在被调用时执行；
   `# statement` 是唯一的模块级出口，本文件用它做启动。
2. **`# namespace` 正文里的代码块不进产物。** xl 只打印声明出来的成员，所以拿 Node 内建模块这件事必须落成声明——
   见文件末尾的 `CjcliHost`。
3. **模块级声明必须排在 `# class` 之前**（`E1005`），而 `# statement` 与 `# namespace` 的相对顺序无所谓
   （`Main` 的前向引用靠函数提升活着）。所以类型、常量、全部入口函数在 `CjcliHost` 之前，`# statement` 压在最后。

`# type` 不支持泛型参数，也不需要。

# type CliOptions = { Input: string; Output: string; AstJson: boolean; TsAst: boolean; Help: boolean; Version: boolean; Error?: string }

命令行参数解析结果。

`Error` 是用法错误的通道：非空时 `Main` 直接以退出码 `1` 收场，**不再往下走**。
少了它，「`-o` 少给一个路径」这种情况会退化成「没有输入文件」，
于是 `Main` 转去读 stdin —— 在终端上直接挂住等人输入。

`AstJson` / `TsAst` 是出口开关：两个都 `false` 走 XML（默认），`AstJson` 走 token 树的
JSON，`TsAst` 走 TS 形状。三个出口打的是同一棵树，
所以它们是**两个布尔量**，而不是三条各自解析一次的路径。

`# type` 的等号右侧是**原文**，会被原样搬进产物。

# method CjcliVersion:()=>string

版本号。

打印给 `cjcli --version`。它跟 `xl.json` 里的工具版本无关，是**入口程序**的版本。

```ts
return "0.1.0";
```

# method CjcliUsage:()=>string

用法说明。

```ts
return [
  "cjcli — Cangjie 语法层命令行",
  "",
  "用法：",
  "  cjcli <文件>              解析源文件，缩进 XML 打到标准输出",
  "  cjcli <文件> -o <文件>    解析后写入指定文件（同一份缩进文本）",
  "  cjcli <文件> --ast-json   解析后把 AST JSON 打到标准输出",
  "  cjcli <文件> --ts-ast     解析后把 TS 形状 JSON 打到标准输出",
  "  cjcli                    从标准输入读源码",
  "  cjcli -h, --help         打印本说明",
  "  cjcli -v, --version      打印版本",
  "",
].join("\n");
```

# method Main:(args:Array<string>)=>void

命令行入口。

参数表用的是 `process.argv` 的**前两段之后**——node 与脚本路径都不算参数，所以切掉两段。
调用这一下由本文件末尾的 `# statement` 负责，它会被原样搬进产物，`dist/cjcli.ts` 因此是**自执行**的。

`Template` 每次调用都新建：`Root` 构造时会往 `template.BranchTemplate.DefaultValue` /
`ReorganizationTemplate.DefaultValue` 上装通用队列，模板是**有状态**的，跨次复用会把上一份上下文的解析痕迹带进来。

打印走 `CommonUtil.FormatXml`：**每个元素一行、两格缩进**，叶子（只有文本的元素）留在同一行。
缩进只动空白、不动任何标签或属性值——`Root.ToString()` 的紧凑形态仍然是测试与差分用的那一份。

`-o` 与标准输出**打的是同一份缩进文本**，两种出口不再有形态差异。

`--ast-json` / `--ts-ast` 换的是**出口**，不是解析：同一棵树、同一次 `Process`，只是最后取
`CjcliAstJson` / `CjcliParseTsAst` 而不是 `Root.ToString()`。JSON 是紧凑单行（`JSON.stringify(value)` 不带缩进参数），
不经过 `FormatXml`——那个函数只认得 XML，喂它一段 JSON 会原样返回。

**`--ast-json` / `--ts-ast` 与 `-o` 可以同时出现**：写进文件的仍是同一条 JSON 文本，
只是「已写入 …」那行提示照旧打到标准输出。两个开关同时给时 `--ts-ast` 优先
（`TsAst` 那一支在前）——它们是同一个位置的两种形状，不是可以叠加的东西。

```ts
const options = CjcliParseArguments(args);
if (options.Help) {
  process.stdout.write(CjcliUsage());
  return;
}
if (options.Version) {
  process.stdout.write(CjcliVersion() + "\n");
  return;
}
if (options.Error !== undefined) {
  process.stderr.write("cjcli: " + options.Error + "\n");
  process.exitCode = 1;
  return;
}
let content: string | null = null;
let filePath = "";
if (options.Input === "") {
  content = CjcliReadStdin();
} else {
  const inputPath = CjcliAbsolutePath(options.Input);
  if (!CjcliFileExists(inputPath)) {
    process.stderr.write("cjcli: 找不到输入文件：" + options.Input + "\n");
    process.exitCode = 1;
    return;
  }
  content = CjcliReadFile(inputPath);
  filePath = inputPath;
}
if (content === null) {
  process.stderr.write("cjcli: 读取输入失败\n");
  process.exitCode = 1;
  return;
}
let text: string | null = null;
if (options.TsAst) {
  text = CjcliParseTsAst(content, filePath);
} else if (options.AstJson) {
  text = CjcliParseAstJson(content, filePath);
} else {
  const xml = CjcliParseXml(content, filePath);
  if (xml !== null) {
    text = CommonUtil.FormatXml(xml);
  }
}
if (text === null) {
  process.exitCode = 1;
  return;
}
if (options.Output === "") {
  process.stdout.write(text);
  return;
}
const outputPath = CjcliAbsolutePath(options.Output);
CjcliWriteFile(outputPath, text);
process.stdout.write("已写入 " + outputPath + "\n");
```

# method CjcliParseArguments:(args:Array<string>)=>CliOptions

解析命令行参数。

规则刻意取得很窄：只有一个位置参数（输入文件），`-o` / `--output` 需要一个值，
`--ast-json` 是布尔开关（不带值），其余 `-` 开头的词一律算用法错误。
用法错误只记进 `Error` 并立刻返回，由 `Main` 统一收尾——**打印与退出码只有一处**。

```ts
const options: CliOptions = {
  Input: "",
  Output: "",
  AstJson: false,
  TsAst: false,
  Help: false,
  Version: false,
};
let index = 0;
while (index < args.length) {
  const item = args[index];
  if (item === "-h" || item === "--help") {
    options.Help = true;
    index++;
    continue;
  }
  if (item === "-v" || item === "--version") {
    options.Version = true;
    index++;
    continue;
  }
  if (item === "--ast-json") {
    options.AstJson = true;
    index++;
    continue;
  }
  if (item === "--ts-ast") {
    options.TsAst = true;
    index++;
    continue;
  }
  if (item === "-o" || item === "--output") {
    if (index + 1 >= args.length) {
      options.Error = item + " 需要一个路径";
      return options;
    }
    options.Output = args[index + 1];
    index += 2;
    continue;
  }
  if (item.startsWith("-")) {
    options.Error = "未知选项 " + item;
    return options;
  }
  if (options.Input !== "") {
    options.Error = "只接受一个输入文件";
    return options;
  }
  options.Input = item;
  index++;
}
return options;
```

# method CjcliParse:(content:string, filePath:string)=>Token | null

把一段源码解析成 token 树；出错时把诊断打到标准错误并返回 `null`。

**三个出口共用这一段**：XML 出口要的是 `Root`，JSON 出口要的是 `Root.ToList()`，
TS 形状出口要的是 `projectRoot(Root.ToList(), content)`，
但「造模板 → 包文档 → 驱动解析 → 异常收敛」这条链是同一段，所以它返回**根单元本身**，
由三个很薄的取值函数（`CjcliParseXml` / `CjcliParseAstJson` / `CjcliParseTsAst`）各自取自己那一份。
这样「三个出口看的是同一棵树」不是一句约定，而是**结构上没有第二条解析路径**。

`TextDocument` / `TextContext` 与整棵树不再登记到任何持有者身上（见 README「资源生命周期：交给 GC」），
解析完也不需要显式释放，所以这里只剩 `try/catch` 一层，用来做异常收敛。

`Template` 不能省：`TextContext` 的构造器要求一个模板，并会在造根单元之前**自动装上**通用跳转队列与
重组队列（见 `typescript/parse-pipeline.xl.md`），所以这里只需 `new Template()`。

异常收敛到 `null`：`SyntaxException` 的 `Message` 里已经带了出错位置那段带 `^` 下划线的文本（`TextDocument.GetRangeLines` 的产物），
直接打出来比让调用栈回溯更有用。布局是「`cjcli: 解析失败`」一行 + 诊断正文——信息里本来就带换行，所以不再拼多余前缀。

```ts
try {
  const template = new Template();
  const document = new TextDocument(content);
  document.FilePath = filePath;
  const context = new TextContext(template);
  context.Process(document);
  return context.Root;
} catch (error) {
  process.stderr.write("cjcli: 解析失败\n" + CjcliErrorText(error) + "\n");
  return null;
}
```

# method CjcliParseXml:(content:string, filePath:string)=>string | null

解析并取**紧凑 XML**（`Root.ToString()`）。

缩进不在这里做：`Main` 拿到它之后再走 `CommonUtil.FormatXml`，
所以「XML 的紧凑形态」与「打印形态」仍然是同一条数据的两步，而不是两个出口。

```ts
const root = CjcliParse(content, filePath);
if (root === null) {
  return null;
}
return root.ToXmlString();
```

# method CjcliParseAstJson:(content:string, filePath:string)=>string | null

解析并取 **AST JSON**（紧凑单行）。

JSON 的形状就是 `Root.ToList()` 的返回值：一个数组，每个元素是一个节点对象
（`type` + 本节点自己的键 + 可选的 `children` / 具名分段），根这一层的每个节点另带 `range`。
这一份与上游 Cangjie 的 `code.analyse` 同源（`Root.ToList()` → JSON），
**不是**从 XML 反推出来的第二套结构。

`JSON.stringify` 不带第三参数：紧凑单行是刻意选的形态——它是要被程序读的，
缩进只会让下游多一步解析前的剥离；人要看缩进形态用 XML 出口。

序列化本身在 `Token.ToJsonString` 里（那里处理 `Map` → 普通对象那一层），
这里只负责把异常收敛到 `null`，与 XML 出口同一个形状。

```ts
const root = CjcliParse(content, filePath);
if (root === null) {
  return null;
}
return root.ToJsonString();
```

# method CjcliParseTsAst:(content:string, filePath:string)=>string | null

解析并取 **TS 形状 JSON**（紧凑单行）。

形状就是 `ts.createSourceFile` 那一套：`{ kind, pos, end, …字段 }`，`kind` 用**名字**
（`"VariableStatement"` / `"Block"`…），字段名按 TS 的叫法（`statements` / `members` / `parameters`…）。
投影本身在 [`typescript/print-ast-common.xl.md`](typescript/print-ast-common.xl.md)：`projectRoot(Root.ToList(), 原文)`，
**它不重新解析**，产物树是唯一事实来源。

**标准输出只有形状本身**：`projectRoot` 的返回值里还有一个 `unmapped`（投影没覆盖、
原样透传的产物标签名单），那份记账走**标准错误**——stdout 是给人 `diff` 的，多一个包装键
就得让每个下游先取 `.ast`。诊断走 stderr 与解析失败那条通道是同一条口径。

`Map` → 普通对象那一层收在 `Token.ToPlain` 一处、序列化收在 `ToJsonText` 一处
（`JSON.stringify` 对 `Map` 静默给 `{}`），所以这里与 `samples/check.mjs` 走的是**同一个**
序列化函数——「命令行打出来的 = 库里拿到的」不是靠两边各写一遍对齐的。
这一处只负责把异常收敛到 `null`，与另外两个出口同一个形状。

```ts
const root = CjcliParse(content, filePath);
if (root === null) {
  return null;
}
const projected = projectRoot(root.ToList(), content);
if (projected.unmapped.length > 0) {
  process.stderr.write("cjcli: 投影未覆盖的标签 " + projected.unmapped.length + " 种：" + projected.unmapped.join(" ") + "\n");
}
return ToJsonText(projected);
```

# method CjcliErrorText:(error:any)=>string

把抛出来的东西转成能读的一行文本。

catch 到的可能是 `SyntaxException`（有 `Message`）、原生 `Error`（有 `message`），也可能是任何别的东西。
直接 `String(error)` 对普通对象会得到 `[object Object]`，这里按可用字段依次降级。

```ts
if (error instanceof SyntaxException) {
  return (error as any).Message;
}
if (error !== null && error !== undefined && typeof error === "object" && "message" in error) {
  return String((error as any).message);
}
return String(error);
```

# method CjcliReadFile:(path:string)=>string

读文本文件。

BOM 由 `CjcliStripBom` 摘掉——`readFileSync` 不会自动吞掉 BOM，
不处理的话第一个 token 会带上一个 `\uFEFF`。

```ts
return CjcliStripBom(CjcliHost.Fs().readFileSync(path, "utf8"));
```

# method CjcliWriteFile:(path:string, content:string)=>void

写文本文件。

```ts
CjcliHost.Fs().writeFileSync(path, content, "utf8");
```

# method CjcliReadStdin:()=>string

从标准输入读满。

没有输入文件时走这条路，方便 `echo "let a = 1" | cjcli`。文件描述符 `0` 就是 stdin。

```ts
return CjcliStripBom(CjcliHost.Fs().readFileSync(0, "utf8"));
```

# method CjcliStripBom:(content:string)=>string

摘掉开头的字节序标记。

`readFileSync(path, "utf8")` 不会自动吞掉 BOM，所以这一层要自己补回来——
否则 `\uFEFF` 会被当成普通字符喂进解析器，第一个 token 平白多一个字符。

```ts
return content.charCodeAt(0) === 0xfeff ? content.substring(1) : content;
```

# method CjcliFileExists:(path:string)=>bool

文件是否存在且是常规文件。

```ts
return CjcliHost.Fs().existsSync(path) && CjcliHost.Fs().statSync(path).isFile();
```

# method CjcliAbsolutePath:(path:string)=>string

转成绝对路径。

错误信息里报绝对路径，才定位得到文件。

```ts
return CjcliHost.Path().resolve(path);
```

# class CjcliHost

运行环境：把入口要用到的 Node 内建模块收在一处。

**为什么不直接写模块级 `import { readFileSync } from "node:fs"`。** 顶层 `import` 会被提升到产物文件的开头，
插到 `xl` 的产物头前面，破坏产物头的可校验性。`process.getBuiltinModule()` 是等价的替代：
它是运行时调用，不会被提升，也不需要 `@types/node` 之外的任何声明。

**为什么是两个静态工厂方法而不是两个静态字段。** 字段类型得写成 `typeof import("node:fs")`，
而 xl 的类型标注（`E1204`）不接受 `typeof` / `import(...)` 这种写法；写成 `any` 又会把 `readFileSync` 的重载信息丢掉。
方法让类型标注留在 ts 体里、由 ts 自己推，字段类型则由 xl 已知的 `any` 兜住。

## static method Fs:()=>any

文件系统模块。

`process.getBuiltinModule` 是 Node 22.3 起提供的同步取内建模块的入口；调用点只在运行时发生，所以产物里不会多出顶层语句。

返回值标注成 `any` 只是为了过 xl 的方法检查，真正的类型由下面这行 `as` 断言给出。

```ts
return process.getBuiltinModule("node:fs") as typeof import("node:fs");
```

## static method Path:()=>any

路径模块。

```ts
return process.getBuiltinModule("node:path") as typeof import("node:path");
```

# statement

启动：把命令行参数交给 `Main`。

`# statement` 的围栏内容会被**原样**搬进产物，而且**不带 `export`、不包函数**——这正是 `dist/cjcli.ts` 自执行的原因。

位置规则只有两条：`# statement` 与 `# namespace` 谁先谁后都行（`Start()` 这种前向引用靠函数提升活着），
但模块级声明必须排在 `# class` 之前（`E1005`），所以它落在文件末尾。

**shebang 不在产物里，这是刻意的。** 我试过把 `#!/usr/bin/env node` 写进这个围栏，xl 会原样输出，
但 `tsc` 只接受**文件第 1 行**的 `#!`：放在产物头之后会直接报 `TS18026`（`'#!' can only be used at the start of a file`），
而且 tsc 还会把这行编译成 `!/usr/bin / env;` 这种垃圾。产物的前三行永远是 `xl` 的产物头，所以 shebang 只能落在
`bin/cjcli.js` 上（见 README「构建」一节）——那一行是整条链路上唯一 xl 表达不了的东西。

`process.argv.slice(2)`：`[0]` 是 node，`[1]` 是脚本路径，其余才是用户参数。

```ts
Main(process.argv.slice(2));
```
