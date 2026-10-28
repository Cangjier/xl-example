# 机械事实 — typescript/tokens/expressions/forms/operator

文件数 4；字节 50933；代码行 1112。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `typescript/tokens/expressions/forms/operator/assignment-possible-shape.xl.md` | 12162 | 244 | AssignmentPossibleShape extends PossibleShape | | AppendTo IsSymbolText IsIdentifierWord IsLValue IsRValue RawAfter LooksLikeAssignmentAfter EqualIndexes IsAssignmentEqualAt IsBodyAssignmentEqualAt LastEqualBefore ComputeByIndex ContinuationClaim IsBuildable BuildByIndex | 0 | MountedUnit=×1 |
| `typescript/tokens/expressions/forms/operator/binary-operator-possible-shape.xl.md` | 11011 | 177 | BinaryOperatorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex TextOf HasLeftOperand IsInitializerHead Operand AppendTo | 0 | MountedUnit=×1 dropBasic:splice3 |
| `typescript/tokens/expressions/forms/operator/conditional-possible-shape.xl.md` | 19412 | 533 | ConditionalPossibleShape extends PossibleShape<br>ConditionalMemberPossibleShape extends PossibleShape | | AppendTo RawAfter IsQuestionSymbol IsHeadUnit Family ComputeByIndex ContinuationClaim IsBuildable QuestionIndex HasArrowBranch HasLegacyBranch IsBuildableHeadChar UnbuildableBranchHead WordArrowAt ArrowFollowsQuestion ParenArrowAt BuildByIndex BuildOperand ComputeByIndex IsBuildable BuildByIndex IsColonSymbol BuildColon | 0 | MountedUnit=×2 |
| `typescript/tokens/expressions/forms/operator/reassociation-possible-shape.xl.md` | 8348 | 158 | ReassociationPossibleShape extends PossibleShape | | ComputeByIndex BuildByIndex Reassociate BuildOperator LeftOperandIndex AppendTo | 0 | MountedUnit=×2 dropBasic:splice5/len=0 |
