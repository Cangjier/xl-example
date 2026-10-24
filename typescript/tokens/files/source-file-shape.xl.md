# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { BlockBodyChildBracketHook, BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
import { BreakStatementPossibleShape } from "../statements/break-statement-possible-shape.xl.md"
import { ClassDeclarationPossibleShape } from "../declarations/class-declaration-possible-shape.xl.md"
import { ContinueStatementPossibleShape } from "../statements/continue-statement-possible-shape.xl.md"
import { DebuggerStatementPossibleShape } from "../statements/debugger-statement-possible-shape.xl.md"
import { DoStatementPossibleShape } from "../statements/do-statement-possible-shape.xl.md"
import { EmptyStatementPossibleShape } from "../statements/empty-statement-possible-shape.xl.md"
import { EnumDeclarationPossibleShape } from "../declarations/enum-declaration-possible-shape.xl.md"
import { ExportAssignmentPossibleShape } from "../declarations/export-assignment-possible-shape.xl.md"
import { ExportDeclarationPossibleShape } from "../declarations/export-declaration-possible-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ForInStatementPossibleShape } from "../statements/for-in-statement-possible-shape.xl.md"
import { ForOfStatementPossibleShape } from "../statements/for-of-statement-possible-shape.xl.md"
import { ForStatementPossibleShape } from "../statements/for-statement-possible-shape.xl.md"
import { FunctionDeclarationPossibleShape } from "../declarations/function-declaration-possible-shape.xl.md"
import { IfStatementPossibleShape } from "../statements/if-statement-possible-shape.xl.md"
import { ImportDeclarationPossibleShape } from "../declarations/import-declaration-possible-shape.xl.md"
import { ImportEqualsDeclarationPossibleShape } from "../declarations/import-equals-declaration-possible-shape.xl.md"
import { InterfaceDeclarationPossibleShape } from "../declarations/interface-declaration-possible-shape.xl.md"
import { LabeledStatementPossibleShape } from "../statements/labeled-statement-possible-shape.xl.md"
import { ModuleDeclarationPossibleShape } from "../declarations/module-declaration-possible-shape.xl.md"
import { NamespaceExportDeclarationPossibleShape } from "../declarations/namespace-export-declaration-possible-shape.xl.md"
import { ReturnStatementPossibleShape } from "../statements/return-statement-possible-shape.xl.md"
import { RootExpressionStatementPossibleShape } from "../statements/root-expression-statement-possible-shape.xl.md"
import { SourceFileEndPossibleShape } from "./source-file-end-possible-shape.xl.md"
import { StatementPossibleShape } from "../statements/statement-possible-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { SwitchStatementPossibleShape } from "../statements/switch-statement-possible-shape.xl.md"
import { ThrowStatementPossibleShape } from "../statements/throw-statement-possible-shape.xl.md"
import { TryStatementPossibleShape } from "../statements/try-statement-possible-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../declarations/type-alias-declaration-possible-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "../statements/control-flow-statement-possible-shape.xl.md"
import { DeclarationStatementPossibleShape } from "../statements/declaration-statement-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "../statements/variable-statement-possible-shape.xl.md"
import { WhileStatementPossibleShape } from "../statements/while-statement-possible-shape.xl.md"
import { WithStatementPossibleShape } from "../statements/with-statement-possible-shape.xl.md"
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
this.CatalogGuide = new CatalogGuide(SourceFileShape.CreatePossibleShapes(), new SourceFileEndPossibleShape());
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
for (const item of this.Data.slice()) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
for (const item of this.Data) {
  if (!item.Closed) {
    throw new Error("SourceFileShape.Close: 有子单元无法关闭");
  }
}
// AST 的 children 只有子形状：文件末尾没人认领的 trivia（空格 / 行尾注释 / 换行）与 EOF 哨兵在收尾时丢掉。
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !(item instanceof EndOfFileTokenShape));
return CloseStates.Nothing;
```


## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

块体目录的**建壳时机**（Stage 4b）：括号创建不触发父目录判定，所以块壳默认要到 `}` 关闭时才建出来
（同文件第二块时第二个 `{` 还会被第一个壳吞掉）。这里在 `{` 刚 `SignIn` 之后把根目录判一格：块壳「在 `{` 就建」，
块体目录（`EnableBlockBodyCatalog`）随即挂上。

**默认档也生效**（r2）：建壳只决定「谁来建这个 `BlockShape`」，块内语句仍由 `BuildBlock` 的 legacy 递归建
（块体目录未挂），XML / AST 与在 `}` 才建壳逐字节相同；两档的差别只是壳的时机。`EnableShellExpressions=false`
（legacy 对拍档）时仍然什么都不做。

**只在语句首建壳**：`Decide(Data, 这个下标) == ShellBlock` 才是块语句的 `{`。标签体（`en:\n{ f() }`）的 `{`
不是语句首（条目的首代码单元是 `en`），这里不建壳，否则根表达式候选会借「晚建壳」把 `en : {` 整条吞进壳、
逼出一次文件级 fallback。判据仍只有 `Decide` 一份，不在这里新写。

**函数体目录（Stage 4j 步骤 3）**：`function f() { … }` 的函数体括号创建时，`{` 前面那个非 trivia 单元是
已闭合的参数表 `(` 括号。此时给**新括号**挂块体语句目录（`BlockPossibleShape.TryMountFunctionBody`），
函数体里的语句由 possible 增量建 `StatementShape`，收口时 `FunctionDeclarationShape.FromUnits` 的
`bodyBuilder.BuildStatement()` 落到 `BuildBlock()`，再由 `HasBuiltBodyStatements` / `CollectBodyStatements`
按序收集 —— 与块体共用同一条收集通道，不新增第二条建树路径。

这一步**不重算根目录**（S4i 方案 A 的全表红就是这么来的）：只读根 `Data` 找前一个单元，判错了也只是
多挂一份**不会抛错**的目录（`BlockBodyWaitingPossibleShape` 是它的终结候选）。

```ts
if (StatementRouteUtil.EnableShellExpressions && StatementRouteUtil.EnableBlockBodyCatalog) {
  // 装一次括号宿主监听：类体里的方法 / 构造器体括号由 `Bracket.OnBracketCreatedEvent` 转调回来。
  if (Bracket.ChildBracketCreatedHook === null) {
    Bracket.ChildBracketCreatedHook = new BlockBodyChildBracketHook();
  }
  BlockPossibleShape.TryMountFunctionBody(this, bracket, context);
}
if (StatementRouteUtil.EnableShellExpressions
  && bracket instanceof Bracket
  && (bracket as Bracket).StartBracketChar === "{"
  && StatementRouteUtil.Decide(this.Data, this.Data.length - 1) === StatementRoute.ShellBlock) {
  this.ComputePossibleShapesByIndex(this.Data.length - 1, context);
}
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理一个窗口。`buffer.IsEof()`（空区间 `[count,count)`，`index === count`）是文件末尾，走一条单独的收尾路径：

1. 还有挂载单元就先关掉它（没有分号的 import / export 也在这一刻收口）；
2. 关掉最后一个还开着的子单元——文件末尾不会再有下一个字符来关它，标识符 / 符号 / 字符串 / 空白 / 注释谁开着就关谁；
3. 造一个 `EndOfFileTokenShape`，签入签出文件末尾位置（`index === count`，空区间）、加进根，再 `TryToClose`。
   它关闭时会问父单元重算候选，根单元的终结候选 `SourceFileEndPossibleShape` 随即签出根并关闭根。

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
  const last = this.Last();
  if (last !== null && !last.Closed) {
    last.TryToClose(context);
  }
  const eof = new EndOfFileTokenShape(this.Template);
  eof.SignIn(index);
  eof.SignOut(index);
  this.Add(eof);
  eof.TryToClose(context);
  return;
}
if (this.SourceRange.Start < 0) {
  this.SignIn(index);
}
super.Process(context, buffer, index);
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (SourceFileShape.CreatePossibleShapesCache === null) {
  SourceFileShape.CreatePossibleShapesCache = [
    // Stage 4r：声明 / 导入导出族的专用壳候选放最前（只挂根目录；通用候选原位不动，块体目录不受影响）。
    // legacy 声明候选在第 1-12 位且同格 Accept，排在它们之后时本族轮不到（S4q 的 DeclarationShellCount=0）；
    // 让位由各候选顶部的 `Decide === ShellDeclarationFamily` 门控完成，这一行只让专用候选先被判。
    new DeclarationStatementPossibleShape(),
    new ImportDeclarationPossibleShape(),
    new ExportDeclarationPossibleShape(),
    new StatementPossibleShape(),
    // new ImportEqualsDeclarationPossibleShape(),
    // new ExportAssignmentPossibleShape(),
    // new NamespaceExportDeclarationPossibleShape(),
    new ImportEqualsDeclarationPossibleShape(),
    new ClassDeclarationPossibleShape(),
    new InterfaceDeclarationPossibleShape(),
    new ExportAssignmentPossibleShape(),
    new NamespaceExportDeclarationPossibleShape(),
    // new ClassDeclarationPossibleShape(),
    // new InterfaceDeclarationPossibleShape(),
    // new FunctionDeclarationPossibleShape(),
    new FunctionDeclarationPossibleShape(),
    new EnumDeclarationPossibleShape(),
    // new ModuleDeclarationPossibleShape(),
    // new EnumDeclarationPossibleShape(),
    new ModuleDeclarationPossibleShape(),
    new TypeAliasDeclarationPossibleShape(),
    // 可行性原型 A：根层 `let` / `const` / `var` 声明先建 `StatementShape` 壳（`;` / ASI 由壳的终结候选收口）。
    new VariableStatementPossibleShape(),
    // Stage 4c: generic control-flow / declaration-family statement shell.
    new ControlFlowStatementPossibleShape(),
    // Stage 1 T1d：普通表达式起点建 `StatementShape` 壳（终结候选收口，AST 由 `StatementBuilder` 原子建）。
    new RootExpressionStatementPossibleShape(),
    new BlockPossibleShape(),
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
return SourceFileShape.CreatePossibleShapesCache;
```
