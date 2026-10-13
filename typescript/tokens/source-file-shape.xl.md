# dependencies
```xl
import { CatalogGuide } from "../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../core/syntax/possible-shape.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { BreakStatementPossibleShape } from "./break-statement-possible-shape.xl.md"
import { ClassDeclarationPossibleShape } from "./class-declaration-possible-shape.xl.md"
import { ContinueStatementPossibleShape } from "./continue-statement-possible-shape.xl.md"
import { DebuggerStatementPossibleShape } from "./debugger-statement-possible-shape.xl.md"
import { DoStatementPossibleShape } from "./do-statement-possible-shape.xl.md"
import { EmptyStatementPossibleShape } from "./empty-statement-possible-shape.xl.md"
import { EnumDeclarationPossibleShape } from "./enum-declaration-possible-shape.xl.md"
import { ExportAssignmentPossibleShape } from "./export-assignment-possible-shape.xl.md"
import { ExportDeclarationPossibleShape } from "./export-declaration-possible-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { ForInStatementPossibleShape } from "./for-in-statement-possible-shape.xl.md"
import { ForOfStatementPossibleShape } from "./for-of-statement-possible-shape.xl.md"
import { ForStatementPossibleShape } from "./for-statement-possible-shape.xl.md"
import { FunctionDeclarationPossibleShape } from "./function-declaration-possible-shape.xl.md"
import { IfStatementPossibleShape } from "./if-statement-possible-shape.xl.md"
import { ImportDeclarationPossibleShape } from "./import-declaration-possible-shape.xl.md"
import { ImportEqualsDeclarationPossibleShape } from "./import-equals-declaration-possible-shape.xl.md"
import { InterfaceDeclarationPossibleShape } from "./interface-declaration-possible-shape.xl.md"
import { LabeledStatementPossibleShape } from "./labeled-statement-possible-shape.xl.md"
import { ModuleDeclarationPossibleShape } from "./module-declaration-possible-shape.xl.md"
import { NamespaceExportDeclarationPossibleShape } from "./namespace-export-declaration-possible-shape.xl.md"
import { ReturnStatementPossibleShape } from "./return-statement-possible-shape.xl.md"
import { SwitchStatementPossibleShape } from "./switch-statement-possible-shape.xl.md"
import { ThrowStatementPossibleShape } from "./throw-statement-possible-shape.xl.md"
import { TryStatementPossibleShape } from "./try-statement-possible-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "./type-alias-declaration-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
import { WhileStatementPossibleShape } from "./while-statement-possible-shape.xl.md"
import { WithStatementPossibleShape } from "./with-statement-possible-shape.xl.md"
```

# namespace cangjie

# class SourceFileShape extends UnitToken

整份源码的顶点，对应 `SyntaxKind.SourceFile`：

```txt
（空文件）
import a from "m";
const x = 1;
```

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
this.CatalogGuide = new CatalogGuide(SourceFileShape.CreatePossibleShapes());
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (SourceFileShape.CreatePossibleShapesCache === null) {
  SourceFileShape.CreatePossibleShapesCache = [
    new ImportDeclarationPossibleShape(),
    new ImportEqualsDeclarationPossibleShape(),
    new ExportDeclarationPossibleShape(),
    new ExportAssignmentPossibleShape(),
    new NamespaceExportDeclarationPossibleShape(),
    new ClassDeclarationPossibleShape(),
    new InterfaceDeclarationPossibleShape(),
    new FunctionDeclarationPossibleShape(),
    new EnumDeclarationPossibleShape(),
    new ModuleDeclarationPossibleShape(),
    new TypeAliasDeclarationPossibleShape(),
    new VariableStatementPossibleShape(),
    new BlockPossibleShape(),
    new EmptyStatementPossibleShape(),
    new ExpressionStatementPossibleShape(),
    new IfStatementPossibleShape(),
    new DoStatementPossibleShape(),
    new WhileStatementPossibleShape(),
    new ForStatementPossibleShape(),
    new ForInStatementPossibleShape(),
    new ForOfStatementPossibleShape(),
    new ContinueStatementPossibleShape(),
    new BreakStatementPossibleShape(),
    new ReturnStatementPossibleShape(),
    new WithStatementPossibleShape(),
    new SwitchStatementPossibleShape(),
    new LabeledStatementPossibleShape(),
    new ThrowStatementPossibleShape(),
    new TryStatementPossibleShape(),
    new DebuggerStatementPossibleShape(),
  ];
}
return SourceFileShape.CreatePossibleShapesCache.slice();
```
