# xl-example

把 Cangjie（一个用 C# 写的「模拟执行任意语言」的步骤机）的 **syntax 层**改写成 **xl-md 规范**（`*.xl.md`）的项目。

规范是唯一事实来源，产物由 xl 生成。当前目标语言是 `ts`——xl 的内置打印器直出，离线、确定性、字节稳定——所以这份规范写得对不对可以被机器**逐字节验证**，不依赖任何模型判断。

C# 原文：`C:\Users\Admin\Documents\GitHub\cangjie-publish\cangjie`。

---

## 1. 目标与验收

**目标**：ts 端口对同一份源码，产出与 C# 原项目**逐字节一致**的 XML。

原项目的解析入口就三步（见 `cangjie-typesharp/TSScriptEngine.cs`）：

```csharp
TextDocument document = new(owner, script);
TextContext textContext = new(owner, Template);
textContext.Process(document);
string xml = textContext.Root.ToString();   // ← 验收用的 XML
```

**验收方式**：C# 侧生成基准 XML（golden），ts 侧跑同一批输入，逐字节比对。基准由 C# 产出而不是 ts 自己产出——否则就成了自证。

---

## 2. 范围与状态

范围 = `Core/Syntax/**` + `Core/Exceptions/**` + 解析路径需要的 `Core/Extensions` 辅助 + `Dawn/Text/**`（`TextDocument` / `TextContext` / `Template` + 全部 Tokens）。

**排除**：`Core/Steper/**`、`Dawn/Steper/**`、`Core/NativeOperatorMethods/**`（执行层，不在解析路径上），以及 `Core/Syntax/BaseExtensions.cs`（它依赖 `Core/Steper`）。

| 波次 | 内容 | 状态 |
| --- | --- | --- |
| W0 | 脚手架 + golden 工具 + 映射文档 | ✅ |
| W1 | `Core/Syntax` 骨架（26 文件） | ✅ |
| W2 | `Dawn/Text` 基础设施 + `ListExtension` | ✅ |
| W3 | token 层（68 文件） | ✅ |

**四个检查全部通过**：`xl check --strict` 105 文件 0 诊断、`tsc`（两个配置）0 错误、
`node tools/regression.cjs` **27/27 逐字节一致**。
| W4 | `Root` / `TextContext` / `ListExtensions` | ✅ |
| W5 | 解析入口 + golden 回归 | ✅ |

三个闸门，缺一不可：

| 闸门 | 判据 |
| --- | --- |
| 结构 | `xl check --strict` 零诊断 |
| 类型 | `tsc -p tsconfig.json` 零错误 |
| **语义** | `node tools/regression.cjs` 全部夹具逐字节一致 |

前两个闸门挡不住「能编译但语义错」的问题（例如把可空结构体解包 `.Value` 照抄进 ts，会把**字符**塞进范围字段）。**第三个闸门才是验收。**

---

## 3. 目录

```text
xl.json                      构建配置：目标 ts、输出 dist、cache 5 版
tsconfig.json                只做类型检查（--noEmit），校验 dist 产物
tsconfig.build.json          把 dist 编成 CommonJS 的 JS，供 tools/ 下的脚本运行
docs/cangjie-port.md         C# → xl.md 的映射规矩 M1–M33（每条带依据）
docs/port-brief.md           移植执行手册（自包含，含"已踩过的坑"与自查清单）
docs/port-plan.md            波次计划、闸门现状、剩余文件清单

owners/                      对应原 Owners/
core/syntax/                 对应原 Core/Syntax/
core/exceptions/             对应原 Core/Exceptions/
core/extensions/             对应原 Core/Extensions/ListExtension.cs
core/common-util.xl.md       对应原 CommonUtil.cs（只取解析路径用到的 XmlDecode）
dawn/text/                   对应原 Dawn/Text/（含 tokens/ 下的全部 token）
dist/                        xl 直出的 ts 产物（不手改）
build/                       tools/ 用的 JS（由 tsconfig.build.json 产出，不手改）
.xl/                         增量 cache 与历史版本（不手改）

tools/golden/                C# 侧基准生成器（事实来源）
tools/parse.cjs              ts 侧解析入口：源码 → XML
tools/regression.cjs         golden 回归
tests/fixtures/inputs/*.ts   夹具输入
tests/fixtures/xml/*.xml     由 C# 生成的基准 XML
```

规范文件的目录层级**镜像 C# 项目的目录层级**（目录小写、文件名 kebab-case），产物路径照抄该层级（`dawn/text/tokens/for/for.xl.md` → `dist/dawn/text/tokens/for/for.ts`）。

---

## 4. 使用

### 4.1 改规范 → 看诊断 → 出产物 → 查类型

```text
xl_check   paths=["."] targets=["ts"] strict=true    静态检查
xl_build   targets=["ts"]                            ts 直出写盘
tsc -p tsconfig.json                                 类型检查
```

`xl_build` 按指纹跳过未变的文件：改一个 `*.xl.md`，只有它的产物会被重写。

### 4.2 跑解析（源码 → XML）

```sh
tsc -p tsconfig.build.json          # dist/*.ts → build/*.js
node tools/parse.cjs <输入文件> [输出文件]   # 不给输出文件就写标准输出
```

### 4.3 跑 golden 回归

```sh
tsc -p tsconfig.build.json
node tools/regression.cjs           # 全部夹具
node tools/regression.cjs 12 13     # 只跑名字里含 12 / 13 的夹具
```

不一致时会给出**首个差异字符的位置与前后上下文**。

### 4.4 重新生成基准（改了夹具、或 C# 原文升级后）

基准由 C# 侧产出。本机 NuGet restore 是坏的（任何**新建**项目报 `MSB4181`），所以 `build-golden.ps1` 绕开 MSBuild 的 restore，直接用 SDK 自带的 Roslyn `csc` 编译：

```powershell
powershell -File tools\golden\build-golden.ps1
# 然后对每个 tests\fixtures\inputs\*.ts 跑 tools\golden\out\Golden.dll，写进 tests\fixtures\xml\
```

`tools/golden/Golden.csproj` 是正统入口，等 restore 修好后可用。

> **注意**：重跑基准前先确认 C# 原文没变过。基准是**事实**，不是"再跑一遍看看"的东西。

---

## 5. 约定

改规范前必读两份文档：

- [`docs/cangjie-port.md`](docs/cangjie-port.md) —— 映射规矩 **M1–M33**。C# 的哪些形状在 xl.md 里表达不了、项目统一怎么改写（构造器重载 → 静态工厂、`params`、`out`、`ref`、`struct`、BCL 接口、泛型基类、运算符重载…），每条都注明依据（诊断码 / ts 错误号 / 实测源码行号）。
- [`docs/port-brief.md`](docs/port-brief.md) —— 执行手册。含**"已踩过的坑"**：依赖路径锚点表、`.Value` 是可空结构体解包、重载改名清单、`InitialStatementReorganizationQueue` 的遗漏点、静态/实例调用、bool 进 XML 要大写，以及 7 条收尾自查清单。

几条最要紧的：

- **类名必须与 C# 完全一致**（含大小写）。`Token.ToXmlString` 用运行时类型名当 XML 标签名，差一个字母整棵树就废了。
- **`SourceRange.Start!.Value` 里的 `.Value` 是「可空结构体解包」**，ts 侧一律去掉；照抄会把字符塞进范围字段。
- 每个类 / 接口成员都要有散文说明，否则 `W3102`。
- `dist/` 与 `build/` 都是产物，产物头标了 `DO NOT EDIT`：改 `*.xl.md` 后重新生成。
