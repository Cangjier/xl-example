# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
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
import { SwitchStatementPossibleShape } from "../statements/switch-statement-possible-shape.xl.md"
import { ThrowStatementPossibleShape } from "../statements/throw-statement-possible-shape.xl.md"
import { TryStatementPossibleShape } from "../statements/try-statement-possible-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../declarations/type-alias-declaration-possible-shape.xl.md"
import { VariableStatementPossibleShape } from "../statements/variable-statement-possible-shape.xl.md"
import { WhileStatementPossibleShape } from "../statements/while-statement-possible-shape.xl.md"
import { WithStatementPossibleShape } from "../statements/with-statement-possible-shape.xl.md"
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
return SourceFileShape.CreatePossibleShapesCache;
```
