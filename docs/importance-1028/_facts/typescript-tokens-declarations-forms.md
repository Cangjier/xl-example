# 机械事实 — typescript/tokens/declarations/forms

文件数 8；字节 91683；代码行 1907。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `typescript/tokens/declarations/forms/declaration-asi-boundary.xl.md` | 19178 | 462 | DeclarationAsiBoundary | | CanClose CanCloseAtLineBreak IsBareYieldTail ShapeTailStartsStatement IsBlockHostBoundary ArrowBodyCloseStartsStatement BlockHost NextCodeChar EndsWithLineBreak LastCodeIndex StartsNewStatementLine NextLineWord HasAnnotationShape EndsWithClosingBracket BlocksTypedTailClose HasClosableShape ReplayLeftover | 0 | — |
| `typescript/tokens/declarations/forms/declare-variable-possible-shape.xl.md` | 6051 | 92 | DeclareVariablePossibleShape extends PossibleShape | | Owns ComputeByIndex IsBuildable BuildByIndex | 0 | lookahead:NextCode( |
| `typescript/tokens/declarations/forms/export-inner-declaration-delegate.xl.md` | 17835 | 355 | ExportInnerDeclarationShape extends ShapeToken<br>ExportInnerStartPossibleShape extends PossibleShape<br>ExportInnerFunctionEndPossibleShape extends PossibleShape<br>ExportInnerDelegate | | ComputeByIndex IsBuildable BuildByIndex ComputeByIndex BuildByIndex InnerStart ProbeKind TryDelegate BuildInner BuildVariable BuildFunction | 0 | lookahead:NextCode( MountedUnit=×1 dropBasic:splice3 |
| `typescript/tokens/declarations/forms/import-export-declaration-mount.xl.md` | 7467 | 129 | ImportExportDeclarationMount | | TryBuild Mount | 0 | MountedUnit=×1 dropBasic:splice3 |
| `typescript/tokens/declarations/forms/import-export-legacy-declaration-mount.xl.md` | 32481 | 739 | ImportExportLegacyDeclarationMount<br>ImportExportLegacyEndScan<br>ImportExportLegacyEndPossibleShape extends PossibleShape<br>ImportEqualsReferenceScan<br>ImportEqualsReferencePossibleShape extends PossibleShape<br>ExportAssignmentValueScan<br>ExportAssignmentValuePossibleShape extends PossibleShape<br>NamespaceExportNameScan<br>NamespaceExportNamePossibleShape extends PossibleShape | | CodeUnits Ready TryBuild FillImportEquals ChildCandidates IsOpenTail ComputeByIndex BuildByIndex ComputeByIndex BuildByIndex IsBuildable ComputeByIndex BuildByIndex IsBuildable ComputeByIndex BuildByIndex IsBuildable | 0 | lookahead:tokenIndex + 1 loop(possible)×11 MountedUnit=×2 dropBasic:splice6 |
| `typescript/tokens/declarations/forms/interface-declaration-mount.xl.md` | 3165 | 59 | InterfaceDeclarationMount | | TryBuild Mount | 0 | MountedUnit=×1 dropBasic:splice2 |
| `typescript/tokens/declarations/forms/namespace-body-declaration-mount.xl.md` | 3254 | 41 | NamespaceBodyDeclarationMount | | CreatePossibleShapes IsEnabled Owns Install | 0 | — |
| `typescript/tokens/declarations/forms/type-alias-declaration-mount.xl.md` | 2252 | 30 | TypeAliasDeclarationMount | | TryBuild | 0 | — |
