# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
import { ClassDeclarationPossibleShape } from "../declarations/class-declaration-possible-shape.xl.md"
import { EnumDeclarationPossibleShape } from "../declarations/enum-declaration-possible-shape.xl.md"
import { ExportAssignmentPossibleShape } from "../declarations/export-assignment-possible-shape.xl.md"
import { ExportDeclarationPossibleShape } from "../declarations/export-declaration-possible-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { FunctionDeclarationPossibleShape } from "../declarations/function-declaration-possible-shape.xl.md"
import { ImportDeclarationPossibleShape } from "../declarations/import-declaration-possible-shape.xl.md"
import { ImportEqualsDeclarationPossibleShape } from "../declarations/import-equals-declaration-possible-shape.xl.md"
import { InterfaceDeclarationPossibleShape } from "../declarations/interface-declaration-possible-shape.xl.md"
import { ModuleDeclarationPossibleShape } from "../declarations/module-declaration-possible-shape.xl.md"
import { NamespaceExportDeclarationPossibleShape } from "../declarations/namespace-export-declaration-possible-shape.xl.md"
import { RootExpressionStatementPossibleShape } from "../statements/root-expression-statement-possible-shape.xl.md"
import { SourceFileEndPossibleShape } from "./source-file-end-possible-shape.xl.md"
import { StatementPossibleShape } from "../statements/statement-possible-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../declarations/type-alias-declaration-possible-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "../statements/control-flow-statement-possible-shape.xl.md"
import { ControlHeadPossibleShape } from "../statements/control-head-possible-shape.xl.md"
import { ExpressionBracketPossibleShape } from "../expressions/forms/shared/expression-bracket-possible-shape.xl.md"
import { ExpressionAtomRegistry } from "../expressions/forms/shared/expression-atom-registry.xl.md"
import { DeclarationStatementPossibleShape } from "../statements/declaration-statement-possible-shape.xl.md"
import { DeclareVariablePossibleShape } from "../declarations/forms/declare-variable-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "../statements/variable-statement-possible-shape.xl.md"
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
// [B3:HEAD] 控制流头 `(` 的目录在这里装配：先注册 `ControlHead` 角色目录。
// 顺序是硬要求——目录必须在任何一只括号之前注册，否则 `Resolve` 会先把它记成
// `Fallback("catalog-not-registered:ControlHead")`。
// [B3b:LEGACY] **增量模式闸**：`EnableControlHeadCatalog` 只在 `IsIncrementalShapesEnabled()` 为真时生效。
ControlHeadPossibleShape.ResetAtoms();
// [B4:EXPR] 表达式括号内容目录（对象 / 数组 / 调用实参 / 分组）。
// ① 每文件先清登记表（`ExpressionAtomRegistry` 与 `ExpressionBracketPossibleShape.States`
//    都是**身份表**，不清就会跨文件命中上一棵树的节点）；
// ② 装配只在增量模式、且 `EnableExprBracketCatalog` 为真时做。
ExpressionAtomRegistry.Reset();
ExpressionBracketPossibleShape.Reset();
if (StatementRouteUtil.EnableExprBracketCatalog && StatementRouteUtil.IsIncrementalShapesEnabled()) {
  ExpressionBracketPossibleShape.EnsureRegistered();
}
if (StatementRouteUtil.EnableControlHeadCatalog && StatementRouteUtil.IsIncrementalShapesEnabled()) {
  ControlHeadPossibleShape.EnsureRegistered();
}
// [T7e] 容器建树由 `VariableDeclarationShape` 的关闭拍候选
// （`ContainerClosePossibleShape.BuildByIndex`）完成，这里没有任何装配。
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

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

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

## private static field CreateLegacyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (SourceFileShape.CreatePossibleShapesCache === null) {
  SourceFileShape.CreatePossibleShapesCache = [
    // Stage 4r：声明 / 导入导出族的专用壳候选放最前（只挂根目录；通用候选原位不动，块体目录不受影响）。
    // legacy 声明候选在第 1-12 位且同格 Accept，排在它们之后时本族轮不到（S4q 的 DeclarationShellCount=0）；
    // 让位由各候选顶部的 `Decide === ShellDeclarationFamily` 门控完成，这一行只让专用候选先被判。
    new DeclarationStatementPossibleShape(),
    // [A2-D3] ambient 变量声明（`declare const|let|var`）的提前挂壳候选：绑定格建变量三层壳。
    // 排在通用声明壳之后不影响判定（每个候选都按同一格求值，`Candidates` 是集合），
    // 让位由候选自己的 `Owns` 与两处 `[XL-B3f]` 的同源判据完成。
    new DeclareVariablePossibleShape(),
    new ImportDeclarationPossibleShape(),
    new ExportDeclarationPossibleShape(),
    // **Stage 5d-5：根 legacy 语句候选在这里退场**。原第 4 位是 `new StatementPossibleShape()`。
    // 它只剩「`Legacy` 路由里还没壳化的那几种」（`await using` / `using` 声明 / `let` `using` 当标签 /
    // `async` 非箭头 …），而默认解析里这些形态本来就会被 `SourceFileEndPossibleShape` 的收尾路径
    // 按同一段建造器建出来（实测 6300 用例上它只建 7 条、AST 0 差、fallback 0 增）；代价是它每格都问一次
    // `StatementScanner.ScanRoot`（全语料 17129 次）。所以默认目录不再注册它；false 态仍在原位注册
    // （`CreateLegacyPossibleShapesCache`），文件级 fallback 逐位不变。
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
    new ExpressionStatementPossibleShape(),
  ];
}

if (SourceFileShape.CreateLegacyPossibleShapesCache === null) {
  // 同一批候选、同一个顺序，只在原第 4 位（0 基下标 3）插回根 legacy 语句候选。
  const withRootLegacyStatement = SourceFileShape.CreatePossibleShapesCache.slice();
  withRootLegacyStatement.splice(3, 0, new StatementPossibleShape());
  SourceFileShape.CreateLegacyPossibleShapesCache = withRootLegacyStatement;
}

// 目录按**当前态**取：默认解析拿壳目录，关闭态拿回旧目录。两份都建一次就永久缓存，
// 因为同一个进程里两种态会交替出现（文件级 fallback 就是同一次 Parse 里的第二次装配）。
return StatementRouteUtil.EnableShellExpressions
  ? SourceFileShape.CreatePossibleShapesCache
  : SourceFileShape.CreateLegacyPossibleShapesCache;
```
