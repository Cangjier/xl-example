# xl-example

用 xl 写成的一套语言前端：**`*.xl.md` 是唯一的事实来源**，同一份规范可以生成多种目标语言。

它解析 TypeScript 风格的源码——把字符流啃成一棵 token 树，再把树打印成 XML。
产物里带一个命令行入口 `cjcli`，可以直接拿一个源文件跑出这棵树。

## 构建链路

```
*.xl.md  --xl build-->  dist/ts/**/*.ts  --tsc-->  build/ts/**/*.js  --node-->  运行
```

```bash
npm install          # 只需要 @types/node 与 typescript
xl build             # 规范 → dist/ts/**/*.ts（增量；无改动时 skipped）
npm run compile      # dist/ts/**/*.ts → build/ts/**/*.js（tsc，strict）
npm run samples      # 三个样本与各自 *.expected.xml 逐字节对照
node build/ts/cjcli.js samples/hello.ts
```

`npm run build` 是前两步的串联（`xl build && tsc`）。

`tsconfig.json` 的 `include` 是 `dist/**/*.ts`、`rootDir` 是 `dist`，所以 `dist/ts/cjcli.ts` 落在
`build/ts/cjcli.js`——产物路径里的 `ts/` 来自**目标语言目录**，不是 `rootDir` 多出来的一层。
`exclude: ["dist/cpp"]` 是必要的：`dist/cpp/build/CMakeFiles/**/compiler_depend.ts` 是 CMake 的时间戳文件、
不是 TypeScript，`tsc` 一读它就报 `TS1127`。

生成物：`dist/ts/` 与 `build/ts/`，都在 `.gitignore` 里。

### 多目标

同一份规范同时面向多个目标语言，分工是：

| 目标 | 通道 | 谁生成 |
| --- | --- | --- |
| `ts` | 直出 | xl 的打印器，离线、确定性、字节稳定 |
| 其它（cpp / csharp / …） | 计划 | 生成器按 `xl_plan` / `xl_context` 给出的路径与结构契约产出，`xl_emit` 负责校验、盖产物头、归档旧版 |

- [docs/xl-to-cpp.md](docs/xl-to-cpp.md)：C++ 目标的生成规范（映射规则、部件划分、必读的编译陷阱）。
- [docs/cpp-design-notes.md](docs/cpp-design-notes.md)：C++ 目标上那些「只能这么写」的结构性取舍。

## 类型约定

规范里的签名只用**中立类型**：`int` / `string` / `bool` / `void` / `Array<T>` / `Map<K, V>` / `T | null` /
函数类型（`(item:T)=>bool`）/ 类类型 / 泛型参数。不放任何目标语言专有的写法——签名是要喂给多个打印器的。

两条具体的克制：

- **`# type` 的等号右侧是原文**，会被原样搬进产物。所以它只用来写**函数类型别名**
  （`# type ItemModifier = (item:any)=>void`）。不要用它写对象字面量或字符串字面量联合——
  那种写法等于把某个目标语言的语法钉进规范里。
- **`any` 是唯一的例外**，只出现在「宿主环境的动态值」这一类位置：异常的内层异常、
  `RuntimeObject` 的值、`SyntaxContext` 的变量表、`cjcli` 里取 Node 内建模块的返回值。
  语言层的结构一律用具体类型或 `T | null`。
- **token 树只产出 XML**，没有 `ToDictionary` / `ToList` 那样的动态字典投影：
  那种形状（`Map<string, any>` / `Array<any>`）对多语言目标是负担，要别的形状就在调用方自己遍历 `Data`。

## 解析优先级在哪

token 层的公共契约——**跳转优先级**与**重组优先级**——只在
[dawn/text/parse-pipeline.xl.md](dawn/text/parse-pipeline.xl.md) 里：

- `ParsePipeline.CreateGeneralQueue()`：每处理一个字符，按这个顺序问每个 `Branch` 要不要接手；
- `ParsePipeline.GeneralReorganize`：每个单元关闭时，按这个顺序把子单元合并成更高层结构；
- `ParsePipeline.Install(template)`：往模板上装这两张表**与语言配置**（关键字表、禁用方法名表）。
  `TextContext` 构造时调它，所以调用方只需要 `new Template()`。

要看「这个语言的解析优先级是什么」，读这一个文件就够了；新增 token 的改动点也在这里。
队首是声明层、队尾是关键字兜底，**顺序本身就是语义**：

```text
Decorator → Class → Function → Enum → MethodDeclaration → Label → Let → Field → New → Method → …
… → TypeAssign → Lamda → TypeDefine → Ternary → Try → Switch → IfSet → For → Foreach → While → …
… → WrapSymbol → CompoundAssignment → NotNull → Keyword
```

## 支持的语法构造

| 构造 | 产物 | 属性 |
| --- | --- | --- |
| `class A<T = {}> extends B implements C, D { … }` | `<Class>` + `<ClassBody>` | `ClassName` `ExtendsClassName` `ImplementsInterfaceNames` `Modifiers` |
| `interface I<T = {}> extends A, B { … }` | `<Interface>` + `<InterfaceBody>` | `InterfaceName` `ExtendsInterfaceNames` `IsExport` |
| `namespace N { … }` / `module M { … }` / `declare global { … }` | `<Namespace>` + `<NamespaceBody>` | `NamespaceName` `Modifiers`（`export` / `declare`） |
| `function f<T>(x: T): U { … }` / `declare function f(): void` | `<Function>` + `<FunctionBody>` | `FunctionName` `Modifiers` |
| 类/对象成员 `m<T>(x): U { … }` | `<MethodDeclaration>` + `<MethodBody>` | `MethodName` `Modifiers` |
| `class A { m<T>(x): U { … } }` / 接口与类里的成员签名 `m?(x): U;` | `<MethodDeclaration>`（**签名没有 `<MethodBody>`**） | `MethodName` `Modifiers` |
| 成员字段 `private n = 1` / `readonly name: string` / `count?: T[]` | `<Field>` | `FieldName` `Modifiers` |
| 返回类型段（`function` / 方法 / 箭头函数） | `<ReturnType>` | — |
| `enum Color { … }` / `const enum Flag { … }` | `<Enum>` + `<EnumBody>` | `EnumName` `Modifiers` |
| `switch (x) { case 1: … default: … }` | `<Switch>` `<SwitchCompare>` `<SwitchSegment Key>` `<SwitchCase>` `<SwitchStatement>` | — |
| `@Component({…})` | `<Decorator>` | `DecoratorName` |
| `outer:` | `<Label>`（自闭合） | `LabelName` |
| `let` / `const` / `var`（含解构） | `<Let>`（自闭合） | `fieldName` / `unpackArrayFieldNames` / `unpackObjectFieldNames` |
| `if` / `for` / `foreach` / `while` / `do…while` / `try` | `<IfSet>` `<For>` `<Foreach>` `<While>` `<DoWhile>` `<Try>` 及各自的分段 | 见各自文件 |
| `name(...)`（调用）/ `name: Type`（类型标注） | `<Method>` / `<TypeDefine>` | `MethodName` |
| `type X = { a: number }` / `let x: { m(): void }`（**类型位**的对象类型） | `<TypeLiteral>` + `<TypeLiteralBody>`（成员是 `Field` / `MethodDeclaration` / `Signature`） | — |
| `interface I { (a: number): string }` / `new (a: number): I` | `<Signature Kind="call">` / `<Signature Kind="construct">` | `Kind` |
| 泛型实参段与类型参数段（`Array<T>` / `<T extends X = Y>`） | `<GenericType>` | `StartBracketChar` `EndBracketChar` |
| 字符串（常量 / 内插 / 逐字 / 原始 / 模板） | `<String>` + `<ConstString>` / `<InterpolationString>` | 见 `tokens/string/` |
| `async` / `await` / `return` / `throw` / `readonly` … | `<Keyword>` | — |

`Modifiers` 是声明前面那一串修饰词按源码顺序 `join(",")`（`export` / `declare` / `default` / `abstract` /
`async` / `public` / `private` / `protected` / `static` / `readonly` / `override` / `get` / `set` / `const`）。

[samples/declarations.ts](samples/declarations.ts) 把上表逐项走了一遍，产物是
[samples/declarations.expected.xml](samples/declarations.expected.xml)。

## 设计约定

写新 token 或改解析顺序时要守的几条（都是这个项目自己的约定，不是风格偏好）：

- **节点名就是 XML 标签名**：`ToXmlString` 覆写里取的是 `this.constructor.name`，
  所以 `Class` / `Enum` / `IfSegment` 这些类名不能随便改；反过来，重组规则类（`*Reorganization`）不进树、不进 XML，
  名字随便取。
- **嵌套类必须写在外层类之前**：外层类的静态字段（`JumpIn` / `AppendIn` / `Instance`）在类定义时就
  `new` 那个嵌套类，写反了会命中暂时性死区（TDZ）。
- **软换行是独立单元**（`WrapSymbol`），靠「跳过它」与「最后摘掉它」两步处理：
  相邻判定一律走 `SkipNextWrapSymbol` / `SkipPreviousWrapSymbol`。
- **声明头先认领、`Keyword` 兜底**：`class` / `function` / `switch` 这些词要先被各自的上下文规则吃掉，
  剩下的散词才升级成 `Keyword`（所以 `Keyword` 排在重组队列的最后）。
- **`{ }` 括号不跑重组队列**：类体 / 函数体 / 循环体里的内容，是各段 token（`ClassBody` / `FunctionBody` /
  `ForBody`…）在构造时挂上语句队列之后才成形的。
- **一行的边界要显式收**：声明规则用 `DeclarationEnd` 把结尾的软换行并进自己的范围，
  否则它会留在父单元里、被 `StatementReorganization2` 收成一个空的 `<Statement></Statement>`。

## 已知缺口

> 完整的缺口清单（可回归、可逐步清空）在 [tests/parse/known-gaps.json](tests/parse/known-gaps.json)：
> `npm run cases:run` 会报告「新增缺口 / 台账过期」，`npm run cases:diff` 用 TypeScript 自带 AST 做差分找缺口。
> 下面只列结构性的那几条。

- **`Label` 只是标记节点**，不包含它标的那条语句（产物形如 `<Label LabelName="outer" /><While>…</While>`）：
  标签规则必须排在 `TypeDefine` 之前，那时后面那条语句还没成形，认不出边界；块语句上的标签（`outer: { … }`）完全不识别。
- **`export =` 与 `export default` 没有节点**（`export { … } from` / `export * from` / `export * as ns from` /
  `export type { … } from` 已经有 `Export` 节点——真实语料 92 处 ExportDeclaration 全部成形）。
- **`declare module "x" { … }` 没有节点**（标识符形式 `module M { … }` 有 `Namespace` 节点，字符串形式还没有）。
- **类里的 `static { … }` 块**没有节点。
- **JSX / TSX** 没有支持。
- 实测：`node_modules` 下 226 个真实 `.d.ts` + 123 个本项目产物 `.ts` **全部解析成功、零异常**；
  TypeScript 自带的那份 8MB **打包 JS**（`typescript.js`）仍会在个别
  JavaScript 专有形状上抛内部错误——那是 JS 而不是 TypeScript，不在当前范围内。

## cjcli

[cjcli.xl.md](cjcli.xl.md) → `dist/ts/cjcli.ts` → `build/ts/cjcli.js`。它是命令行入口，不属于语法层本体。

**产物是自执行的**：`cjcli.xl.md` 末尾的 `# statement` 段把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/ts/cjcli.js` 直接就是命令行工具——没有加载器、没有包装进程、没有第三方运行时。

```
cjcli <文件>              解析源文件，XML 打到标准输出
cjcli <文件> -o <文件>    解析后写入指定文件（按 >< 断行）
cjcli                    从标准输入读源码
cjcli -h, --help         打印本说明
cjcli -v, --version      打印版本
```

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

```bash
node build/ts/cjcli.js samples/hello.ts
echo "let x = 1" | node build/ts/cjcli.js
node build/ts/cjcli.js samples/hello.ts -o out.xml
```

## 样本验收

[samples/check.mjs](samples/check.mjs)：`samples/*.ts` 与同名 `*.expected.xml` 逐字节对照。

```bash
npm run samples                 # 比对，全部一致时退出码 0
node samples/check.mjs --update # 用当前产物重写夹具
```

夹具是**单行** XML。比对前把 `-o` 形式拆出来的换行还原成一行，两端都在文件层读写、
不经过控制台编码，中文注释不会在比对里被搅坏。

[samples/diag.mjs](samples/diag.mjs) 打印完整的诊断链：`cjcli` 只打最外层 `SyntaxException` 的位置，
真正的原因在内层异常里（`Token.Process` 会把任何异常包一层，可能包好几层）。

## 为什么留了一个 `bin/cjcli.js`

整条链路上 xl 表达不了的只有 **shebang** 一行：

- `# statement` 能把执行语句写进产物，但插不进 shebang——产物前三行永远是 xl 的产物头，
  而 `tsc` 只认**文件第 1 行**的 `#!`（放别处直接 `error TS18026`，tsc 还会把它编译成垃圾）。
- `package.json` 的 `bin` 需要第 1 行是可执行解释器行，所以它落在 [bin/cjcli.js](bin/cjcli.js)：
  `#!/usr/bin/env node` + `require("../build/ts/cjcli.js")`。它不含任何逻辑。

不需要 shebang 的话（例如只用 `node build/ts/cjcli.js`），把 `bin` 直接指到 `build/ts/cjcli.js` 也行。
检出时必须保持 LF：仓库根的 `.gitattributes` 用 `* text=auto eol=lf` 钉死了。

## 改这个项目

- 规范是 `*.xl.md`：`# dependencies` 写依赖、`# namespace` 之后是声明。
  **散文解释「为什么」**，代码块就是产物本身，标题行（`# class` / `## method` / `## field`）就是签名契约——
  改标题等于改 API。
- 改完跑这三步：

  ```bash
  xl check                     # 结构与规则检查
  npm run build                # xl build && tsc
  npm run samples              # 逐字节对照；产物本该变化时用 --update 重写夹具
  ```

- 产物头里的 `xl:sha256` 是源指纹：规范一变，产物就会重新生成。
