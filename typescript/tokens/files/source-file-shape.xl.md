# dependencies
```xl
import { SourceFileBodyItemHost } from "../items/root-item-rule.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { IRootRule } from "../items/root-rule-contract.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ClassDeclarationRule } from "../declarations/class-declaration-rule.xl.md"
import { EnumDeclarationRule } from "../declarations/enum-declaration-rule.xl.md"
import { ExportAssignmentRule } from "../declarations/export-assignment-rule.xl.md"
import { ExportDeclarationRule } from "../declarations/export-declaration-rule.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { FunctionDeclarationRule } from "../declarations/function-declaration-rule.xl.md"
import { ImportDeclarationRule } from "../declarations/import-declaration-rule.xl.md"
import { ImportEqualsDeclarationRule } from "../declarations/import-equals-declaration-rule.xl.md"
import { InterfaceDeclarationRule } from "../declarations/interface-declaration-rule.xl.md"
import { ModuleDeclarationRule } from "../declarations/module-declaration-rule.xl.md"
import { NamespaceExportDeclarationRule } from "../declarations/namespace-export-declaration-rule.xl.md"
import { SourceFileTailBuilder } from "../items/source-file-tail-builder.xl.md"
import { StatementPossibleShape } from "../statements/statement-possible-shape.xl.md"
import { TypeAliasDeclarationRule } from "../declarations/type-alias-declaration-rule.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
```

# namespace cangjie

# class SourceFileShape extends ShapeToken

```txt
（空文件）
import a from "m";
const x = 1;
```

## constructor:(template:Template)=>void

```ts
super(template);
// 根单元的跳转队列要取「本语言模板」算出来的那份（模板可以禁用某些 basic 跳转），
// 不能直接用全局缓存的 `Template.BasicBranchQueue()`。
const queue = template.BranchTemplate.Get(this.constructor);
if (queue !== null) {
  this.ProcessQueue = queue;
}
this.AdapterRoot = new SourceFileBodyItemHost(this, SourceFileBodyItemHost.CreateRules(SourceFileShape.CreateRules()));
this.BatchAdapter = this.AdapterRoot;
```

## field AdapterRoot:SourceFileBodyItemHost | null = null

根 item 表的宿主，与 `BatchAdapter` 指向同一个对象。`BatchAdapter` 的静态类型只有 `IBatchHost` 接口，
而收口时要读 `RawRange()`，所以这里留一份具体类型的引用。

## private method FinishBody:(context:SyntaxContext)=>CloseStates

EOF 收尾，分三步：

1. **先关最后一个子单元**再 `FlushBatch`：文件末尾那个 `;` 的 basic token 直到关闭才被喂进 item 表；
   先 Flush 会让引擎的 `State.Checked` 停在 `;` 之前，尾巴永远进不了 raw 段；
2. `Flush` 把最后一条没建完的 item 建掉（建不出就记 raw 回退）；
3. **扫描 `Data` 里的裸 basic token 段**逐段重建，而不是只信 `RawRange()`：后者只记最后一段 raw，
   而 raw 段还可能出现在已建 item **之前**（`class` 一格就被判成可建、Build 抛错时 raw 是 `[0,1)`，
   `C {}` 反而是第二段）。`ShapeToken` 之间才是 item 边界。

```ts
const last = this.Last();
if (last !== null && !last.Closed) {
  last.TryToClose(context);
}
this.FlushBatch(context);
const segments: Array<number> = [];
let index = 0;
while (index < this.Data.length) {
  if (this.Data[index] instanceof ShapeToken) {
    index = index + 1;
    continue;
  }
  const from = index;
  while (index < this.Data.length && !(this.Data[index] instanceof ShapeToken)) {
    index = index + 1;
  }
  segments.push(from);
  segments.push(index - 1);
}
// 从右向左重建：splice 只影响右侧下标。
for (let s = segments.length - 2; s >= 0; s = s - 2) {
  const from = segments[s];
  const to = segments[s + 1];
  if (to < from) {
    continue;
  }
  const replaced = SourceFileTailBuilder.BuildTrailingItems(this, from, to, context);
  if (replaced.length > 0) {
    this.Data.splice(from, to - from + 1, ...replaced);
  }
}
// 落单的 `;` 是前一个形状的终结符（`import …;` / `export type { T };` / `a;`）：
// 它不进形状的 `Data`，但 TS 的节点终点含它。这里把它并回前一个形状的右界再丢掉。
let semiAt = 1;
while (semiAt < this.Data.length) {
  const semi = this.Data[semiAt];
  const previous = this.Data[semiAt - 1];
  if (semi instanceof Symbol && (semi as Symbol).Is(";") && previous instanceof ShapeToken
    && previous.SourceRange.EndIndex === semi.SourceRange.StartIndex && semi.SourceRange.EndIndex >= 0) {
    previous.SourceRange.End = semi.SourceRange.EndIndex;
    this.Data.splice(semiAt, 1);
    continue;
  }
  semiAt = semiAt + 1;
}
const adapter = this.AdapterRoot;
if (adapter !== null) {
  adapter.RawRange().Reset();
}
this.TryToClose(context);
return CloseStates.Nothing;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
// 单次 live 遍历：每个未关闭的单元最多尝试关闭两次（与重构前「快照扫一遍 + 再扫一遍」等价），
// 两次之后仍关不掉就是真缺陷。原实现对 `this.Data` 做了三次全扫（slice 快照、再扫、校验扫），
// 这里并成一次，并把 `slice()` 的每文件分配也去掉（PLAN §6.3 WP-3「消三次全扫」）。
let index = 0;
while (index < this.Data.length) {
  const item = this.Data[index];
  if (item.Closed) {
    index++;
    continue;
  }
  item.TryToClose(context);
  if (!item.Closed) {
    item.TryToClose(context);
  }
  if (!item.Closed) {
    throw new Error("SourceFileShape.Close: 有子单元无法关闭");
  }
  // 关闭过程中该格可能被替换/拼接成别的单元：不退格，下一轮检查新单元是否已关闭。
  if (index < this.Data.length && this.Data[index] !== item) {
    continue;
  }
  index++;
}
// AST 的 children 只有子形状：文件末尾没人认领的 trivia（空格 / 行尾注释 / 换行）与 EOF 哨兵在收尾时丢掉。
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !(item instanceof EndOfFileTokenShape));
return CloseStates.Nothing;
```


## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理一个窗口。`buffer.IsEof()`（空区间 `[count,count)`，`index === count`）是文件末尾，走一条单独的收尾路径：

1. 还有挂载单元就先关掉它（没有分号的 import / export 也在这一刻收口）；
2. 关掉最后一个还开着的子单元——文件末尾不会再有下一个字符来关它，标识符 / 符号 / 字符串 / 空白 / 注释谁开着就关谁；
3. 造一个 `EndOfFileTokenShape`，签入签出文件末尾位置（`index === count`，空区间）、加进根，再 `TryToClose`。
   它关闭时会问父单元重算候选，根单元的终结候选 `SourceFileTailBuilder` 随即签出根并关闭根。

```ts
if (buffer.IsEof()) {
  if (this.SourceRange.Start < 0) {
    this.SignIn(index);
  }
  if (this.MountedUnit !== null) {
    const mounted = this.MountedUnit;
    mounted.TryToClose(context);
    mounted.Quit();
  }
  this.FinishBody(context);
  return;
}
if (this.SourceRange.Start < 0) {
  this.SignIn(index);
}
super.Process(context, buffer, index);
```

## private static field CreateRulesCache:Array<IRootRule> | null = null

## static method CreateRules:()=>Array<IRootRule>

```ts
if (SourceFileShape.CreateRulesCache === null) {
  SourceFileShape.CreateRulesCache = [
    new ImportDeclarationRule(),
    new ExportDeclarationRule(),
    new StatementPossibleShape(),
    // new ImportEqualsDeclarationRule(),
    // new ExportAssignmentRule(),
    // new NamespaceExportDeclarationRule(),
    new ImportEqualsDeclarationRule(),
    new ClassDeclarationRule(),
    new InterfaceDeclarationRule(),
    new ExportAssignmentRule(),
    new NamespaceExportDeclarationRule(),
    // new ClassDeclarationRule(),
    // new InterfaceDeclarationRule(),
    // new FunctionDeclarationRule(),
    new FunctionDeclarationRule(),
    new EnumDeclarationRule(),
    // new ModuleDeclarationRule(),
    // new EnumDeclarationRule(),
    new ModuleDeclarationRule(),
    new TypeAliasDeclarationRule(),
    // new VariableStatementPossibleShape(),
    // new BlockPossibleShape(),
    // new EmptyStatementPossibleShape(),
    new ExpressionStatementPossibleShape(),
    // new IfStatementPossibleShape(),
    // new DoStatementPossibleShape(),
    // new WhileStatementPossibleShape(),
    // new ForStatementPossibleShape(),
    // new ForInStatementPossibleShape(),
    // new ForOfStatementPossibleShape(),
    // new ContinueStatementPossibleShape(),
    // new BreakStatementPossibleShape(),
    // new ReturnStatementPossibleShape(),
    // new WithStatementPossibleShape(),
    // new SwitchStatementPossibleShape(),
    // new LabeledStatementPossibleShape(),
    // new ThrowStatementPossibleShape(),
    // new TryStatementPossibleShape(),
    // new DebuggerStatementPossibleShape(),
  ];
}
return SourceFileShape.CreateRulesCache;
```
