# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
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
import { SourceFileEndPossibleShape } from "./source-file-end-possible-shape.xl.md"
import { StatementPossibleShape } from "../statements/statement-possible-shape.xl.md"
import { SwitchStatementPossibleShape } from "../statements/switch-statement-possible-shape.xl.md"
import { ThrowStatementPossibleShape } from "../statements/throw-statement-possible-shape.xl.md"
import { TryStatementPossibleShape } from "../statements/try-statement-possible-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../declarations/type-alias-declaration-possible-shape.xl.md"
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


## method Process:(context:SyntaxContext, source:Source)=>void

处理一个位置。`Source.IsEOF` 是文件末尾哨兵（下标 `-1`、`Value` 为 `"\0"`），走一条单独的收尾路径：

1. 还有挂载单元就先关掉它（没有分号的 import / export 也在这一刻收口）；
2. 关掉最后一个还开着的子单元——文件末尾不会再有下一个字符来关它，标识符 / 符号 / 字符串 / 空白 / 注释谁开着就关谁；
3. 造一个 `EndOfFileTokenShape`，签入签出同一个 EOF 位置、加进根，再 `TryToClose`。
   它关闭时会问父单元重算候选，根单元的终结候选 `SourceFileEndPossibleShape` 随即签出根并关闭根。

```ts
if (source.IsEOF) {
  if (this.SourceRange.Start === null) {
    this.SourceRange.Start = source;
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
  eof.SignIn(source);
  eof.SignOut(source);
  this.Add(eof);
  eof.TryToClose(context);
  return;
}
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = source;
}
super.Process(context, source);
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (SourceFileShape.CreatePossibleShapesCache === null) {
  SourceFileShape.CreatePossibleShapesCache = [
    new ImportDeclarationPossibleShape(),
    new ExportDeclarationPossibleShape(),
    new StatementPossibleShape(),
    // new ImportEqualsDeclarationPossibleShape(),
    // new ExportAssignmentPossibleShape(),
    // new NamespaceExportDeclarationPossibleShape(),
    new ClassDeclarationPossibleShape(),
    new InterfaceDeclarationPossibleShape(),
    new ExportAssignmentPossibleShape(),
    new NamespaceExportDeclarationPossibleShape(),
    // new ClassDeclarationPossibleShape(),
    // new InterfaceDeclarationPossibleShape(),
    // new FunctionDeclarationPossibleShape(),
    new EnumDeclarationPossibleShape(),
    // new ModuleDeclarationPossibleShape(),
    // new EnumDeclarationPossibleShape(),
    new ModuleDeclarationPossibleShape(),
    new TypeAliasDeclarationPossibleShape(),
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
return SourceFileShape.CreatePossibleShapesCache;
```
