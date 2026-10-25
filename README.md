# xl-example

用 xl 写成的一套语言前端：**`*.xl.md` 是唯一的事实来源**，同一份规范可以生成多种目标语言。

它解析 TypeScript 风格的源码——把字符流啃成一棵 token 树，再把树打印成 XML。
产物里带一个命令行入口 `cjcli`，可以直接拿一个源文件跑出这棵树。

> **当前状态提示（2026-10-22）**：仓库已删除 `dawn/` 旧语言层（`1cf6d30d`），当前可复跑的是
> `core/` + `typescript/` 的定向构建与 AST 门禁；根入口 `cjcli.xl.md` 仍引用 `dawn/**`，完整构建与
> `samples/check.mjs` 在当前 HEAD 跑不起来。**当前状态、验证读数、语法覆盖与遗留缺口以
> [docs/Final.md](docs/Final.md) 为准**；本 README 的「解析优先级」「cjcli」「样本验收」等章节是 dawn 时代的
> 历史描述，已知缺口一节也已按当前实测重写。

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
- [docs/statement-ast-pipeline.md](docs/statement-ast-pipeline.md)：一条语句如何从字符变成 AST（以 `let x = 1;` 为案例的全流程与实测 trace）。

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

当前解析机制**不是**旧版的 Dawn `ParsePipeline`：`dawn/` 已在 `1cf6d30d`（2026-10-13）随旧语言层、
`core/runtime` 与全部重组机制一起删除。现在由 **`CatalogGuide`** 驱动：basic token close 时触发父级
`ComputePossibleShapes`，`CatalogGuide` 对 `PossibleShapes`（普通候选）与 `EndPossible`（终结候选）逐格判定、
淘汰、build——流程与硬性规则见 [typescript/IMPORTANCE.md](typescript/IMPORTANCE.md) §3.3 与
[core/syntax/catalog-guide.xl.md](core/syntax/catalog-guide.xl.md)。各语言的候选表/形状在
`typescript/tokens/**` 的 `*-possible-shape` / `*-shape`，新增 token 的改动点就在那里。

旧版本这一节描述的 `dawn/text/parse-pipeline.xl.md`、`ParsePipeline.CreateGeneralQueue/GeneralReorganize/Install`
与那份「Decorator → … → Keyword」队列清单已随 dawn 删除，仅作历史记录，不要再按它找代码。

## 支持的语法构造

| 构造 | 产物 | 属性 |
| --- | --- | --- |
| `class A<T = {}> extends B implements C, D { … }` | `<Class>` + `<ClassBody>` | `ClassName` `ExtendsClassName` `ImplementsInterfaceNames` `Modifiers` |
| `interface I<T = {}> extends A, B { … }` | `<Interface>` + `<InterfaceBody>` | `InterfaceName` `ExtendsInterfaceNames` `IsExport` |
| `function f<T>(x: T): U { … }` / `declare function f(): void` | `<Function>` + `<FunctionBody>` | `FunctionName` `Modifiers` |
| 类/对象成员 `m<T>(x): U { … }` | `<MethodDeclaration>` + `<MethodBody>` | `MethodName` `Modifiers` |
| 成员字段 `private n = 1` / `readonly name: string` / `count?: T[]` | `<Field>` | `FieldName` `Modifiers` |
| 返回类型段（`function` / 方法 / 箭头函数） | `<ReturnType>` | — |
| `enum Color { … }` / `const enum Flag { … }` | `<Enum>` + `<EnumBody>` | `EnumName` `Modifiers` |
| `switch (x) { case 1: … default: … }` | `<Switch>` `<SwitchCompare>` `<SwitchSegment Key>` `<SwitchCase>` `<SwitchStatement>` | — |
| `@Component({…})` | `<Decorator>` | `DecoratorName` |
| `outer:` | `<Label>`（自闭合） | `LabelName` |
| `let` / `const` / `var`（含解构） | `<Let>`（自闭合） | `fieldName` / `unpackArrayFieldNames` / `unpackObjectFieldNames` |
| `if` / `for` / `foreach` / `while` / `try` | `<IfSet>` `<For>` `<Foreach>` `<While>` `<Try>` 及各自的分段 | 见各自文件 |
| `name(...)`（调用）/ `name: Type`（类型标注） | `<Method>` / `<TypeDefine>` | `MethodName` |
| 泛型实参段与类型参数段（`Array<T>` / `<T extends X = Y>`） | `<GenericType>` | `StartBracketChar` `EndBracketChar` |
| 字符串（常量 / 内插 / 逐字 / 原始 / 模板） | `<String>` + `<ConstString>` / `<InterpolationString>` | 见 `core/syntax/basic-tokens/string/` |
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

- **JSX / TSX** 没有支持（`typescript/IMPORTANCE.md` §8）。
- 历史上的几项缺口——类型字面量里的成员节点、无体成员（`abstract f(): void;` / 接口方法）、类的 `static { … }` 块、
  `Label` 不包含所标语句、语句首裸 `[a, b];`、对象/数组字面量在语句首——**都已在 2026-10-21～10-22 的轮次中修掉**，
  2026-10-22 的只读探针复核为 AST 全部 MATCH（明细见 [docs/Final.md](docs/Final.md) §6）。
- 当前仍开放的缺口与口径（无体签名吞后续语句、模板块成员 `declare`、装饰器+`export` 声明、块内 `declare`+`global {}`、
  两个新发现的语料缺口、空白判定表未统一等）见 [docs/Final.md](docs/Final.md) §6。
- 实测（本分支，2026-10-22）：`node_modules` 下 **226 份真实 `.d.ts`**（`typescript/lib` / `@types/node` / undici-types）
  **全部解析成功**，且与本仓 AST **226/226 逐节点一致**；`npm run ast:dts` 是这一门的固定门禁。
  修这一批缺口之前的读数是：**112 份解析崩溃、能解析的 114 份 AST 一致**——归因与当前覆盖见
  [docs/Final.md](docs/Final.md) §6。TypeScript 自带的 8MB **打包 JS**
  （`typescript.js`）不在这一门里：那是 JavaScript 而不是 `.d.ts` 声明。

## cjcli

> **当前不可用**：`cjcli.xl.md` 仍 `import "./dawn/text/*"`（`dawn/` 已于 `1cf6d30d` 删除），根级 `xl build`
> 会以 E1006 中止，`build/ts/cjcli.js` 不存在。下面几小节是 dawn 时代的用法说明，恢复入口（把 `cjcli.xl.md`
> 的依赖改到现行 `core/` + `typescript/`）之前不可执行。

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

## 测试

`tests/` 整套从 `feature/print-direct-ast` 搬来（那个分支比本分支晚约 1250 轮），`tests/parse/*` 那套旧 AST 门
读的是另一个分支的产物，见 [tests/MIGRATION.md](tests/MIGRATION.md)。**本分支权威的 AST 尺子**是：

```bash
npm run ast:cases         # 语料：ast-json 生成快照 + ast-json-diff 逐条对拍（当前 6167/6167）
npm run ast:dts           # 真实 .d.ts 门禁：226 份全部解析成功且 AST 逐节点一致
npm run ast:verify        # 上面两条一起跑
```

`tests/` 的语料体检仍然可用：

```bash
npm run cases:check     # 语料文件头 / 用例格式体检
npm run gates           # 8 道门一次跑完（其中多数是旧分支的门，见 MIGRATION）
```

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
