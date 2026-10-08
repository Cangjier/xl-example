# TS 形状直出口（第三个出口）

> 本文是 **token 树的第三个出口**（TS 形状）的规格：形状、API、验收，以及它与 XML / AST JSON
> 两个出口的关系。实现分两处：**通用支**（三张表 + 横切助手）在
> [`typescript/print-ast-common.xl.md`](../typescript/print-ast-common.xl.md)，
> **逐标签的投影**在各 token 自己的 `PrintAst(ctx, v)`（第 181~198 轮逐块搬完，
> 原来的 `typescript/ts-ast.xl.md` 已删（`git mv` 成 [`typescript/print-ast-common.xl.md`](../typescript/print-ast-common.xl.md)），搬迁手册见 [print-ast-migration.md](history/print-ast-migration.md)）；
> 命令行侧在 [`cjcli.xl.md`](../cjcli.xl.md) 的 `CjcliParseTsAst`。
> 第二个出口（AST JSON）见 [ast-json.md](ast-json.md)。

---

## 1. 是什么

同一个 token 树，投成 **`ts.createSourceFile` 的形状**：一个 `SourceFile` 节点，每个节点
`{ kind, pos, end, …字段 }`。三个约定：

| 约定 | 规则 |
| --- | --- |
| `kind` 用**名字** | `"VariableStatement"` / `"BinaryExpression"` / `"EndOfFileToken"`…**不是数字** |
| 坐标是 `pos` / `end` | 半开区间；来源是产物树每个节点上的 `range`（闭区间 `[起, 止]`），投影自己不发明位置 |
| 字段名按 TS | `statements` / `members` / `parameters` / `declarationList`…；产物里分段本来就叫 `initial` / `compare` / `body` 的那套名字照用 |

**为什么 kind 用名字**：名字是规范的一部分（可读、可改、可 `diff`），而数字要内建一张
300 条的 `SyntaxKind` 枚举表，那张表会跟着 TypeScript 版本漂。查数字是**使用方**的事
（`tests/parse/ts-ast.mjs` 从 `ts.SyntaxKind` 查），投影不必知道。

**不重新解析**：产物树是唯一事实来源，投影只做三件事——换名（`Let` → `VariableDeclaration`）、
补壳 / 提层（补 `VariableStatement` / `VariableDeclarationList`，摊平 `ClassBody` / `ReturnType`）、
按 kind 给 TS 的字段名。

**不猜**：没覆盖的产物标签**原样透传**（`kind` 保留产物标签名）并记进 `unmapped`——
猜出来的节点会让对拍报出假成绩。

**`unmapped` 只记「真的透传进了产物」的那些**（第 199 轮）：投影过程中有些调用点只是
「问一下这个子单元能投出什么」，结果被调用方丢掉、根本不落进 AST——那些访问原来也被记进去，
于是这一栏数的是「投影路过谁」而不是「谁透传进了产物」（实测全语料 9137 处、散布在 48 个文件里，
而真透传的一个都没有；最典型的是各种参数括号 `(a, b)`，投影总是先问一遍再自己摊平）。
现在 `projectRoot` 末尾拿产物自己的 `kind` 集合对一次账（透传节点的 `kind` 就是标签名本身），
这一栏才是一条判据：`cases:tsast` 的退出码已经把它算进去。

---

## 2. 怎么用

命令行（`cjcli`）：

```bash
node build/ts/cjcli.js samples/hello.ts --ts-ast            # 形状本身 → 标准输出（紧凑单行）
node build/ts/cjcli.js samples/hello.ts --ts-ast -o out.json
node build/ts/cjcli.js samples/hello.ts --ts-ast | ...      # 直接喂给对拍 / diff 脚本
```

**标准输出里只有形状本身**：`projectRoot` 的返回值是 `{ ast, unmapped, count }`，
`cjcli` 打的是 `ast`；`unmapped`（投影没覆盖、**并且真的原样透传进了产物**的标签名单）
走**标准错误**，与解析失败那条诊断通道同一口径。这样下游 `diff` 不用先取 `.ast`。

库 API：

```ts
const context = new TextContext(new Template());
context.Process(new TextDocument(source));
const projected = projectRoot(context.Root.ToList(), source);  // { ast, unmapped, count }
const text = ToJsonText(projected);                            // 紧凑单行 JSON
```

`ToJsonText` 是 `cjcli --ts-ast` 与 [`samples/check.mjs`](../samples/check.mjs) **共用**的
同一个序列化函数（`Map` → 普通对象那一层仍然只有 `Token.ToPlain` 一个出处：
`JSON.stringify` 对 `Map` 一律给 `{}`，这是必须显式处理的一步）。

---

## 3. 验收

| 判据 | 命令 | 口径 |
| --- | --- | --- |
| 与 TS 原生 AST 对拍 | `npm run cases:tsast` | 逐节点比 **kind、区间、字段名**；缺（没投出来）与漂移（位置差一点）分开报。退出码按**八条**算：四方向 + 未映射（透传进产物的标签）+ 缺 range + 区间越界 + **抛异常 0**（第 674 轮加的） |
| **发布路径**端到端 | `node tests/parse/ts-ast.mjs --cli` | 真的开 `cjcli <文件> --ts-ast` 进程，拿 stdout 的 JSON 与 `ts.createSourceFile` 对拍（每个文件一个进程，按需跑） |
| 逐字节确定性 | `npm run samples` | `samples/*.expected.tsast.json` 逐字节比对，**不做归一化**（紧凑单行、键序与 `pos` / `end` 都是确定性的） |
| 「命令行 = 库 API」 | `npm run samples` | 同一份源码，`cjcli` 进程与库 API 的输出必须逐字节相同 |
| 用例体检 | `npm run cases:check` | 用例文件本身合不合格（`xl:expect` 里的标签名有没有写错） |
| 用例期望 | `npm run cases:tags` | 用例开头的 `xl:expect` / `xl:absent` 逐条对产物核实（产物标签那一层的判据） |
| 搬家等价性（一次性） | —— | 第 75 轮用一把一次性脚本在全语料上逐字节对拍过：**1399 个文件、0 处不一致**（旧实现 2464 行 JS vs xl 产物）；结论记在台账，脚本随即删除 |

**第 200 轮起测试集只留 AST 相关的这些**（用户口径）：上表最后三行是全部判据。
原来的另外十七把尺子与探针（`diff` / `dashboard` / `matrix` / `lossless` / `structure` /
`boundaries` / `noise` / `astjson` / `shapelint` / `sweep` / `recon*` / `fuzz*` / `align`）
量的是 XML 出口与 token 树的质量，**已删除**（脚本在 git 历史里）；
`tests/parse/` 现在只剩下 `ts-ast.mjs`、`ts-shape.mjs`（转发）、`validate.mjs`（用例体检）。
**用例语料不在这里**（第 685 轮搬走）：token 那一类在 `tests/cases/token/<功能域>/`，
与另外四类（`exec` / `runtime` / `stdlib` / `e2e`）**同一形状**——
布局与文件头文法见 [tests/cases/README.md](../tests/cases/README.md)。

`cases:tsast` **第 181 轮起是绿的**，第 199 轮把退出码从「四方向」扩到「四方向 + 三栏地基」，
第 674 轮又把「抛异常 0」并进退出码。
它原来是一把量成绩的尺子（红着的一栏就是缺口榜），现在它同时是**闸门**——
红一条就不许合。**当前读数只有一份**（根 [README](../README.md) 的「当前状态」表），
这里不抄数字；`xl:known-gap` 那 219 条走另一条账（见
[typescript-parsing-gaps.md](../tests/parse/typescript-parsing-gaps.md)）。

---

## 4. 改这个出口时要动的地方

1. **加/改一个标签的投影**：先找这个标签**自己的 token 文件**里的 `PrintAst(ctx, v)`
   （第 181~198 轮逐块搬过去的那 49 块）；只有**通用支**的东西才动
   [`typescript/print-ast-common.xl.md`](../typescript/print-ast-common.xl.md)——
   那里的 `KIND_BY_TAG` / `FIELD_BY_KIND` / `WRAPPER_FIELDS` / `BODY_FIELDS` 与共享助手。
   表的**重复键**会静默覆盖（`new Map([...])` 同键后写胜），改表时自己过一眼——
   钉它的那把 `cases:shapelint` 已随测试集收窄删除（脚本在 git 历史里）。
2. **改完跑**：`xl check` → `npm run build` → `npm run samples` → `npm run cases:tsast`
   （数字要动，且只按预期动；现在它是**闸门**，八条里红一条就是回归）→ 其余尺子。
3. **`PrintAst` 收到的 `v` 是「视图」不是原始 Map**（`projectNode` 开头那句 `const v = view(node)`），
   凡是从 `ctx` 出去、要吃一棵（子）树的出口，先 `node instanceof Map ? view(node) : node` 再转调；
   搬迁手册（踩过的七个坑，按类型归并）在 [print-ast-migration.md](history/print-ast-migration.md)。
4. **键序是夹具的一部分**：`samples/*.expected.tsast.json` 逐字节比，JSON 的键序也算。
   搬家前那批内联写法的节点（`{ kind, pos, end, …props }`）要用 **`ctx.NodeHead`**，
   新写的节点用 `ctx.Node`（`{ kind, …props, pos, end }`）——第 199 轮把 30 处构造点
   按第 96 轮那份实现逐一对回去（`cases:tsast` 看不见键序，只有 `samples` 看得见）。

---

## 5. 如实记下的取舍

- **产物带 `// @ts-nocheck`**：逐字搬来的函数体是 JS 写法（`const props = {}` 之后再挂字段、
  内层箭头函数不带参数类型…），在 `strict` 的 TS 里要报一百多处；改掉它们就是**改写**，
  不是搬家。类型标注仍然写全——它们是文档，也是将来真要开检查时的起点。
  判据放在下一层：`cases:tsast` 的成绩 + 一次性逐字节对拍。
- **`NUMERIC_LITERAL` 标 `RegExp`、投影整体跑在 `any` 上**：TS 目标准确；
  C++ 目标是同一笔账（与 AST JSON 出口一样，要么 `std::any`，要么「另一个目标的活儿」）。
- **死代码照原样留着**：`stmtLike`（没有调用点）、`projectLogical`（两个 `case` 都够不着）、
  `matchBrace` / `matchingBrace`（一对重复实现）。搬家这一轮不夹带清理——
  要动它们，另开一轮，用尺子量。
- **一个真缺口是这一轮修掉的**（不是绕着它写规范）：对象字面量属性值里
  `f(x) ? { … } : g` 曾被收成「方法声明 + 返回类型 + 方法体」，修在
  [`method-declaration.xl.md`](../typescript/tokens/function/method-declaration.xl.md)：
  形参表后面接**运算符**（`ValueOperators`）、**下标括号** `[`、或**值位关键字**
  （`ValueKeywordTexts`：`in` / `instanceof` / `as` / `satisfies`）⇒ 都是表达式，不是声明。
  最小复现：

  ```ts
  const p = { name: e(z) ? { k: 1 } : g };
  const p = { name: e(z)[0] ? { k: 1 } : g };
  const p = { name: e(z) in o ? { k: 1 } : g };
  ```
