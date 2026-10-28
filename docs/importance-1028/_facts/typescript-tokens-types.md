# 机械事实 — typescript/tokens/types

文件数 62；字节 320919；代码行 7001。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `typescript/tokens/types/angle-judge.xl.md` | 12740 | 399 | AngleJudge | | IsSplitClose Shift Guard ScanDepth IsText PredecessorAllows FindClose FindPair FollowerAllows IsInstantiationClose CanStart FindCloseAhead IsOpenAt IsGroupMember IsOpenGroup | 0 | — |
| `typescript/tokens/types/array-type-shape.xl.md` | 461 | 1 | ArrayTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/call-signature-possible-shape.xl.md` | 3020 | 40 | CallSignaturePossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/call-signature-shape.xl.md` | 521 | 1 | CallSignatureShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/class-get-accessor-possible-shape.xl.md` | 3523 | 47 | GetAccessorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/class-index-signature-possible-shape.xl.md` | 3514 | 47 | IndexSignaturePossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/class-member-catch-all-possible-shape.xl.md` | 1738 | 15 | ClassMemberCatchAllPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | loop(possible)×1 Scan×1 |
| `typescript/tokens/types/class-member-possible-util.xl.md` | 22623 | 604 | ClassMemberPossibleScan<br>ClassMemberItemStartShared<br>ClassMemberPossibleUtil | | AllKinds OnlyKind ImplementedKinds HasKind TextOf IsSeparator IsCompletionBoundary NextChar AngleDepth IsIndexSignatureBracket IsModifierWord HasParameterList DecoratorHeadAt ClassifyHead Extend ScanBoundary ItemStartValid ItemStartOf UpdateItemStartAfterBuild HeadKindOf EarlyHeadKind Analyze Scan BasePos | 0 | share:2/1 |
| `typescript/tokens/types/class-set-accessor-possible-shape.xl.md` | 3490 | 47 | SetAccessorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/class-static-block-declaration-possible-shape.xl.md` | 3589 | 47 | ClassStaticBlockDeclarationPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/class-static-block-declaration-shape.xl.md` | 1631 | 14 | ClassStaticBlockDeclarationShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/computed-property-name-shape.xl.md` | 348 | 1 | ComputedPropertyNameShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/conditional-type-shape.xl.md` | 614 | 1 | ConditionalTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/construct-signature-possible-shape.xl.md` | 4181 | 60 | ConstructSignaturePossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/construct-signature-shape.xl.md` | 1815 | 14 | ConstructSignatureShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/constructor-possible-shape.xl.md` | 3519 | 47 | ConstructorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/constructor-shape.xl.md` | 1622 | 14 | ConstructorShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/constructor-type-shape.xl.md` | 547 | 1 | ConstructorTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/decorator-shape.xl.md` | 903 | 9 | DecoratorShape extends ShapeToken | | FromParts | 0 | — |
| `typescript/tokens/types/function-type-shape.xl.md` | 520 | 1 | FunctionTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/get-accessor-possible-shape.xl.md` | 3387 | 47 | GetAccessorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/get-accessor-shape.xl.md` | 1627 | 14 | GetAccessorShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/import-type-shape.xl.md` | 585 | 1 | ImportTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/index-signature-possible-shape.xl.md` | 3431 | 47 | IndexSignaturePossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/index-signature-shape.xl.md` | 1744 | 14 | IndexSignatureShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/indexed-access-type-shape.xl.md` | 490 | 1 | IndexedAccessTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/infer-type-shape.xl.md` | 457 | 1 | InferTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/intersection-type-shape.xl.md` | 446 | 1 | IntersectionTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/literal-type-shape.xl.md` | 478 | 1 | LiteralTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/mapped-type-shape.xl.md` | 725 | 1 | MappedTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/member-boundary.xl.md` | 19201 | 533 | MemberBoundaryScan<br>MemberBoundaryCache<br>MemberBoundary<br>MemberHeadKind<br>MemberHeadPlan<br>MemberHeadScan | | ScanTypeMemberBoundary FindMemberBoundary FindTypeMemberBoundary IsNewKeyword IsMemberSignatureAwaitingParams IsImportTypeArguments IsInitializerIndexContinuation HasLineBreakBetween CanEndTypeUnit IsLineBreakInsensitiveModifier CanFollowModifierToken LooksLikeMemberStart IsWordStart IsWordChar IsModifierWord CanFollowWord SkipTrivia NextSignificant Plan ModifierCount | 0 | — |
| `typescript/tokens/types/member-shell-catalog.xl.md` | 29691 | 742 | MemberShellFamily<br>MemberShellEntry<br>MemberShellHeadPart<br>MemberShellCatalog | | IsEnabled Reset Report Find IsOpen Drop Prune InstallBodyCatalog NewShell Create FindPart RawData Restore PreviousEnd HeadKindAt BuildKeyword BuildHeadShape WrapAt WrapAll IsCallableKind HasBodyKind InstallParameterList OpenMemberBody IsHeadParameterBracket OnBracketCreated HeadCompute BuildMember Unwrap Finalize OpenNextHead FinalizeShell HandOffOnBodyClose FinalizeAll OpenCount | 0 | MountedUnit=×9 dropBasic:splice8 |
| `typescript/tokens/types/method-declaration-possible-shape.xl.md` | 3657 | 47 | MethodDeclarationPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/method-declaration-shape.xl.md` | 1618 | 14 | MethodDeclarationShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/method-signature-possible-shape.xl.md` | 3470 | 47 | MethodSignaturePossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/method-signature-shape.xl.md` | 1817 | 14 | MethodSignatureShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/named-tuple-member-shape.xl.md` | 339 | 1 | NamedTupleMemberShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/optional-type-shape.xl.md` | 328 | 1 | OptionalTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/parameter-list-possible-shape.xl.md` | 24478 | 617 | ParameterScan<br>ParameterListPossibleShape<br>ParameterPossibleShape extends PossibleShape | | Shapes EnsureRegistered EnsureRegisteredForFunctionType InstallForFunctionType FindState EnsureState DropState TextBetween IsSimpleParameter IsSimpleList IsSimpleArrowList DefaultValueEnd BuildDefaultValue CanBuildDefaults PreviousParamPos NextChar IsTerminator CloseShell Probe Step StepAtBracketCreated NextActionFor Finalize CollectBuiltParameters InstallIfSimple InstallAtBracketCreated ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice2 |
| `typescript/tokens/types/parameter-shape.xl.md` | 606 | 1 | ParameterShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/parenthesized-type-shape.xl.md` | 460 | 1 | ParenthesizedTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/property-declaration-possible-shape.xl.md` | 3717 | 48 | PropertyDeclarationPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/property-declaration-shape.xl.md` | 1370 | 11 | PropertyDeclarationShape extends ShapeToken | | ExitOrPre ComputePossibleShapes | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/property-signature-possible-shape.xl.md` | 25240 | 578 | MemberPossibleScan<br>MemberItemStartShared<br>MemberScanShared<br>MemberPossibleUtil<br>PropertySignaturePossibleShape extends PossibleShape | | Pending IsPending WithoutPending AllKinds OnlyKind HasKind TextOf IsSeparator HasParameterList IsNameToken IsIndexBracket NextChar AngleDepth IsCompletionBoundary HeadKindOf EarlyHeadKind ClassifyHead Analyze Extend ScanBoundary ItemStartValid ItemStartOf UpdateItemStartAfterBuild ReuseScan Scan BasePos MemberParsedWhole ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 share:3/2 Scan×1 |
| `typescript/tokens/types/property-signature-shape.xl.md` | 1640 | 11 | PropertySignatureShape extends ShapeToken | | ExitOrPre ComputePossibleShapes | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/qualified-name-shape.xl.md` | 474 | 1 | QualifiedNameShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/rest-type-shape.xl.md` | 328 | 1 | RestTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/set-accessor-possible-shape.xl.md` | 3391 | 47 | SetAccessorPossibleShape extends PossibleShape | | ComputeByIndex IsBuildable BuildByIndex | 0 | dropBasic:splice1 Scan×1 |
| `typescript/tokens/types/set-accessor-shape.xl.md` | 1617 | 14 | SetAccessorShape extends ShapeToken | | ExitOrPre ComputePossibleShapes OnBracketCreatedEvent | 0 | ExitOrPre×1 ComputePossibleShapes×1 |
| `typescript/tokens/types/template-literal-type-shape.xl.md` | 489 | 1 | TemplateLiteralTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/template-literal-type-span-shape.xl.md` | 472 | 1 | TemplateLiteralTypeSpanShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/this-type-shape.xl.md` | 822 | 10 | ThisTypeShape extends ShapeToken | | FromBasicToken | 0 | — |
| `typescript/tokens/types/tuple-type-shape.xl.md` | 450 | 1 | TupleTypeShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-builder.xl.md` | 93597 | 2335 | TypeBuilder | | Load LoadFrom OriginalConsumed Peek TextOf IsText IsBracket HasCode SpanLeaf ParseTypeBounded ParseReturnTypeBounded SpanNode ParseType ParseUnionType ParseIntersection IsBodyBrace HasLineBreakBeforeCurrent ParsePostfixType ParsePrimaryType ParseParenthesizedType ParseTupleType ParseTypeLiteral ParseTypeMember SpanTypeMember ParseOptionalMark ParseGenericFunctionType ParseFunctionType ParseParameterList ParseDecorators ParseParameter ParseIndexParameter ParseStringLiteralType ParseNumericLiteralType ParseBooleanOrNullLiteralType MakeLiteralType ParseTypeReference ParseTypeArguments ParseName MakeQualifiedName ParseTypeQuery ParseInferType ParseEntityName ParseConstructorType ParseReturnType ParseTypePredicate ParseImportTypeAttributes BuildImportTypeAttribute ParseImportType IsTemplateToken ParseTemplateType HasMappedMember ParseMappedType ParseMappedTypeParameter ParseTypeParameterList ParseTypeParameter | 0 | — |
| `typescript/tokens/types/type-catalog-factory.xl.md` | 13846 | 379 | TypeCatalogFactory | | FirstSignificant LastSignificant TextOf NextSignificantChar NextSignificantText CanEndType NextWord CanEndInitializer ParseType ParseInitializer ParseInitializerFrom AnnotationColon FirstEqual HasTypeAssert StartsTypedInitializer HasTypeArgumentCall HasParameterType AppendFragments | 0 | — |
| `typescript/tokens/types/type-literal-shape.xl.md` | 465 | 1 | TypeLiteralShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-operator-shape.xl.md` | 473 | 1 | TypeOperatorShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-parameter-shape.xl.md` | 607 | 1 | TypeParameterShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-predicate-shape.xl.md` | 582 | 1 | TypePredicateShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-query-shape.xl.md` | 448 | 1 | TypeQueryShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/type-reference-shape.xl.md` | 498 | 1 | TypeReferenceShape extends ShapeToken | |  | 0 | — |
| `typescript/tokens/types/union-type-shape.xl.md` | 439 | 1 | UnionTypeShape extends ShapeToken | |  | 0 | — |
