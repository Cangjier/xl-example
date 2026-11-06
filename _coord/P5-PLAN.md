# P5-PLAN — 类型构造从「Close 全量解析」改为「逐字增量构建」

- **基线**：`xl-example` @ `feature/all-possible-1101`，`4a0f3505`（工作树干净）
- **侦察克隆**：`C:\Users\Admin\Documents\GitHub\xl-example-set\p5-plan`，分支 `feat/p5-plan`
- **构建**：`node _tools/xl-build.mjs` → `dist/ts`；`node node_modules/typescript/bin/tsc -p tsconfig.json` → `build/ts`（exit 0）
- **基线回归**：`node typescript/cases/tts/run.mjs` → `success: 302 case, PASS 302 / FAIL 0`，exit 0
- **性质**：本文只做侦察与设计。所有数据来自**运行时探针**（monkey-patch `build/ts/**` 的静态方法/原型），未改任何实现源码。

---

## 1. 现状表（全部实测，非阅读推断）

### 1.1 复算命令（一条命令重建全部数字）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\p5-plan
node _tools\xl-build.mjs ; node node_modules\typescript\bin\tsc -p tsconfig.json
node _coord\probe\tts-probe.mjs --label base       # → report-base.json + fp-base.json（逐字指纹）
node _coord\probe\tts-probe.mjs --dir todo --label todo
node _coord\probe\analyze.mjs                      # → 本文 §1.2 / §1.3 / §1.6 的原始表
```

`--compare` 用来证明「只影响目标用例」：

```powershell
node _coord\probe\tts-probe.mjs --compare _coord\probe\fp-base.json _coord\probe\fp-<WP>.json
# 输出 { changed:[{id,firstChar,chars}], added:[], removed:[], same:N }
```

指纹口径：每个字符推进后取整棵可见树的 `Token.ToAstLine(0)`，按 `⟨charIndex, treeText⟩` 串进一条 SHA-1，再加 EOF 树。
指纹不同 ⇔ 该 case 的逐字树**在某个字符位置上**不同（`changed[i].firstChar` 就是第一个分叉的字符下标）。

### 1.2 兜底用例：23 条（全在 `success/types/`，`success` 其余 279 条零调用）

`TypeParserApi.ParseAlias` 共 **22 次**，`ParseCompleteReturnType` 共 **1 次**，全部命中调用点
`TypeAliasDeclarationShape.Close`（`typescript/shapes/types/type-alias-declaration-shape.xl.md:51`）；
唯一的例外 `alias-fn-type` 走 `TypeFunctionIncremental` → `type-function-incremental.xl.md:60` 的 `ParseCompleteReturnType`。
**没有任何用例命中 `TypeAliasEndPossibleShape.BuildByIndex:92` 的兜底分支**（该分支恒被 `HasBuiltType()` 短路）。

| # | 用例（`typescript/cases/tts/success/types/`） | 字节 | 兜底 API（次数） | 类型形式（ts AST 权威分类） | WP |
|---|---|---|---|---|---|
| 1 | `alias-ctor-type-abstract.ts` | 32 | ParseAlias×1 | constructor, type-reference | T3 |
| 2 | `alias-fn-type-generic.ts` | 24 | ParseAlias×1 | function, type-reference | T3 |
| 3 | `alias-fn-type.ts` | 31 | **ParseCompleteReturnType×1** + ParseParameterPrefix×1 | function | T3 |
| 4 | `alias-import-type.ts` | 23 | ParseAlias×1 | import-type(+literal) | T1 |
| 5 | `alias-keyof.ts` | 19 | ParseAlias×1 | type-operator, type-reference | T1 |
| 6 | `alias-literal-string.ts` | 13 | ParseAlias×1 | literal | T1 |
| 7 | `alias-mapped-modifiers.ts` | 49 | ParseAlias×1 + ParseTypeParameterOnly×1 | mapped, indexed-access, type-operator, type-reference | T4 |
| 8 | `alias-mapped-remap.ts` | 50 | ParseAlias×1 + ParseTypeParameterOnly×1 + ParseCompleteType×1 | mapped, indexed-access, template-literal, type-operator, type-reference | T4 |
| 9 | `alias-mapped.ts` | 37 | ParseAlias×1 + ParseTypeParameterOnly×1 | mapped, indexed-access, type-operator, type-reference | T4 |
| 10 | `alias-object-call-construct.ts` | 55 | ParseAlias×1 | object-literal, type-reference | T2 |
| 11 | `alias-object-index-readonly.ts` | 42 | ParseAlias×1 | object-literal | T2 |
| 12 | `alias-object-method.ts` | 32 | ParseAlias×1 | object-literal | T2 |
| 13 | `alias-object-optional-readonly.ts` | 33 | ParseAlias×1 | object-literal | T2 |
| 14 | `alias-object.ts` | 23 | ParseAlias×1 | object-literal | T2 |
| 15 | `alias-parenthesized.ts` | 18 | ParseAlias×1 | parenthesized | T1 |
| 16 | `alias-readonly-array.ts` | 27 | ParseAlias×1 | type-operator, array | T1 |
| 17 | `alias-recursive.ts` | 28 | ParseAlias×1 | object-literal, union, literal, type-reference | T5 |
| 18 | `alias-template-literal.ts` | 23 | ParseAlias×1 + ParseCompleteType×1 | template-literal | T4 |
| 19 | `alias-tuple-named.ts` | 32 | ParseAlias×1 | tuple, named-tuple | T2 |
| 20 | `alias-tuple-optional.ts` | 19 | ParseAlias×1 | tuple, optional-type | T2 |
| 21 | `alias-tuple-rest.ts` | 23 | ParseAlias×1 | tuple, rest-type, array | T2 |
| 22 | `alias-tuple.ts` | 26 | ParseAlias×1 | tuple | T2 |
| 23 | `alias-typeof-query.ts` | 18 | ParseAlias×1 | type-query | T1 |

**同一次 Close 里还会二次调入的静态方法**（拆除兜底时一并消失）：
`ParseCompleteType`×2（`mapped-remap`、`template-literal`）、`ParseTypeParameterOnly`×3（三个 mapped）、
`ParseParameterPrefix`×1（`fn-type`）。`ParseTypeParameterList` / `ParseTypeParameterTail` / `ParseTypeArgumentTail` / `ParseEntityNamePrefix`
在 `success` 全量里**零调用**。

### 1.3 按形式分布（兜底集合内，一 case 可多形式，故合计 > 23）

| 形式 | 用例数 | 用例 |
|---|---|---|
| type-reference | 8 | ctor-type-abstract, fn-type-generic, keyof, mapped×3, object-call-construct, recursive |
| object-literal | 6 | object, object-method, object-call-construct, object-index-readonly, object-optional-readonly, recursive |
| type-operator | 5 | keyof, mapped×3, readonly-array |
| tuple | 4 | tuple, tuple-named, tuple-optional, tuple-rest |
| indexed-access | 3 | mapped×3 |
| literal | 3 | import-type, literal-string, recursive |
| mapped | 3 | mapped, mapped-modifiers, mapped-remap |
| array | 2 | readonly-array, tuple-rest |
| function | 2 | fn-type, fn-type-generic |
| template-literal | 2 | mapped-remap, template-literal |
| constructor | 1 | ctor-type-abstract |
| named-tuple | 1 | tuple-named |
| optional-type | 1 | tuple-optional |
| parenthesized | 1 | parenthesized |
| rest-type | 1 | tuple-rest |
| type-query | 1 | typeof-query |
| union | 1 | recursive |
| **intersection** | **0** | （`alias-intersection` 已增量，无需兜底） |

### 1.4 已有「类型候选」清单与缺口矩阵

**已存在的 22 个候选类**（`typescript/shapes/types/`，括号内为文件）：

| 候选类 | 文件 | 负责什么 |
|---|---|---|
| `TypeAliasPossibleShape` | type-alias-possible-shape.xl.md | `type` 关键字 → 建 `TypeAliasDeclarationShape` + **挂 CatalogGuide（:101-114）** |
| `TypeAliasBodyPossibleShape` | 同上 | body 起始是「类型名」（type-reference 起点） |
| `TypeAliasBodyKeywordPossibleShape` | 同上 | body 起始是关键字类型（string/number/…，`keyword-type-shapes` 14 个） |
| `TypeAliasArraySuffixPossibleShape` | 同上 | `T[]` 后缀 |
| `TypeAliasOperatorMemberPossibleShape` | 同上 | 成员位 `readonly` 修饰 |
| `TypeAliasMemberPossibleShape` | type-alias-member-possible-shape.xl.md | 对象字面量**成员**（property/method） |
| `TypeAliasIndexPossibleShape` | 同上 | 索引签名 `[k: string]` |
| `TypeAliasEndPossibleShape` | type-alias-end-possible-shape.xl.md | `;` / 下一条语句起始（收口 + 兜底入口） |
| `TypeAliasChainPossibleShape` / `TypeConditionalChainPossibleShape` / `TypeConditionalEndPossibleShape` | type-conditional-chain.xl.md | 条件类型链 `extends ? :` |
| `TypeArgumentEndPossibleShape` / `TypeArgumentInferPossibleShape` | type-conditional-chain.xl.md | 类型实参 `<>` 与 `infer` |
| `TypeFunctionArrowPossibleShape` | type-function-incremental.xl.md | `=>` 之后的返回类型 |
| `TypeReturnEndPossibleShape` | 同上 | 返回类型收口 |
| `TypePredicate{Start,Bare,Name,IsKeyword,Type}PossibleShape` | 同上 | `x is T` / `asserts x is T` |
| `TypeParameterListOpenPossibleShape` / `TypeParameterEndPossibleShape` | type-parameter-list-shape.xl.md | `<T, U extends X = Y>` |

**形状类几乎全齐**：`type-node-shapes.xl.md` 已有 `UnionTypeShape / IntersectionTypeShape / ConditionalTypeShape / InferTypeShape /
TypeOperatorShape / TypeQueryShape / IndexedAccessTypeShape / ParenthesizedTypeShape / TupleTypeShape / NamedTupleMemberShape /
OptionalTypeShape / RestTypeShape / TypeLiteralShape / PropertySignatureShape / MethodSignatureShape / CallSignatureShape /
ConstructSignatureShape / IndexSignatureShape / FunctionTypeShape / ConstructorTypeShape / TypePredicateShape / MappedTypeShape /
LiteralTypeShape / ImportTypeShape / TypeReferenceShape / QualifiedNameShape / ThisTypeShape / TemplateLiteralTypeShape …`，
`keyword-type-shapes.xl.md` 14 个关键字类型，`type-token-shapes.xl.md` 7 个类型位关键字形状。

> **这就是 P5 的结论性诊断**：缺的不是形状类，是**「这一格该不该建这个形状」的候选（PossibleShape）**。
> 23 条用例的 `type A = <body>` 在 body 起始/续接位置上没有任何候选能 Accept，于是 `HasBuiltType()` 恒为 false，
> 只能等 `Close` 时 `TypeParserApi.ParseAlias` 整段重建。

**完全没有候选的形式**（缺口，P5 要补的就是这些）：

| 形式 | 该形式缺的「候选」 | 兜底用例 |
|---|---|---|
| parenthesized `(` | body 起始 `(` 无候选 | alias-parenthesized |
| tuple `[` / named / optional / rest | body 起始 `[` 无候选；`?`、`...` 元素位无候选 | tuple ×4 |
| object-literal `{` | **body 起始 `{` 无候选**（成员候选只在 `{` 之后才有用） | object ×5 |
| mapped `{ [K in …` | body 起始 `{` 无候选；`in` / `as` / `+readonly` / `+?` 无候选 | mapped ×3 |
| template-literal `` ` `` | body 起始模板串无候选 | template-literal, mapped-remap |
| function type `(`/`<T>(` | body 起始的形参列表无候选（`TypeFunctionArrow` 只管 `=>` 之后） | fn-type, fn-type-generic |
| constructor `new (`/`abstract new` | body 起始 `new`/`abstract` 无候选 | ctor-type-abstract |
| type-operator `keyof`/`typeof`/`unique`（body 起始） | 无候选（`readonly` 只在**成员位**有候选） | keyof, readonly-array, mapped×3 |
| type-query `typeof x` | 无候选 | typeof-query |
| import type `import("m").T` | 无候选 | import-type |
| literal type `"a"`（body 起始） | 无候选（`literal` 只作为条件类型分支被条件链顺带建出） | literal-string, recursive |

**已经有候选、无需新建**：type-reference（`alias-reference` 已增量）、union（`alias-union` 已增量）、
intersection（`alias-intersection` 已增量）、conditional/infer（`alias-conditional*` 已增量）、
type-arguments/泛型参数（`alias-generic-*` 已增量）、indexed-access 后缀（`alias-indexed-*` 已增量）。

### 1.5 基线数字

| 指标 | 数值 | 口径 |
|---|---|---|
| `IdentifierShape` 总数（success 全量） | **677** | 解析完后遍历整棵可见树 |
| `CreatedAt - SourceRange.Start > 2`（**raw**，只用 `CreatedAt`） | **58 / 677** | 与你测到的 `60/679` 同一口径，差 2（见注） |
| `CreatedAt - SourceRange.Start > 2`（**effective**，`CreatedRevisionAt ≥ 0 ? CreatedRevisionAt : CreatedAt`） | **24 / 677** | 规范化后的「真实创建时刻」 |
| raw 直方图 | d=1:602, 2:17, 3:6, 4:5, 5:8, 6:4, 7:5, 8:1, 9:1, 10:1, 11:4, 12:3, 13:5, 14..25:13, 35:1, 43:1 | |

复算：

```powershell
node -e "const r=require('./_coord/probe/report-base.json').identifierBaseline; console.log('total='+r.total,'raw>2='+r.over2RawCount,'eff>2='+r.over2Count); console.log(r.over2Raw)"
```

> **注（与你测到的 60/679 的差异）**：口径一致（raw `CreatedAt`，阈值 `>2`），总数差 2、命中差 2。
> 差异来源只可能是探针在 `build/ts` 的产物/遍历顺序上取到了不同实例；本表每次由 `tts-probe.mjs --label base` 重新生成，
> 是**可复现**的 677/58。effective 口径的 24 条集中在 `lexical/identifier-unicode-escape`(5) 与 `types/alias-*`(19)，
> 说明「延迟创建」的重灾区就是类型体——P5 做完后这批应当显著下降。

### 1.6 兜底之外，已经能完整增量建出的 body

`success/types` 43 条中 **20 条** 在 `Close` 时 `HasBuiltType()` 已为真、**零兜底调用**：

```
alias-array, alias-asserts, alias-conditional, alias-conditional-branch-generic, alias-conditional-infer,
alias-conditional-qualified, alias-generic-args, alias-generic-default, alias-generic-nested-tight-close,
alias-generic-tight-close, alias-indexed-access, alias-indexed-generic, alias-infer-constraint, alias-intersection,
alias-predicate, alias-primitive, alias-qualified-body, alias-reference, alias-template-infer, alias-union
```

即：**关键字类型 / 类型引用与限定名 / 条件类型链（含 infer）/ 泛型参数 / 索引访问后缀 / union / intersection / 谓词** 这条路已经通了。
P5 必须**零回归**保住这 20 条（指纹逐字符不变）。

### 1.7 边界：`todo/incremental/types` 的 42 条**不属于 P5**

探针在 todo 上跑：285 条，**兜底 0 次**，其中 37 条在**第 0 个字符**就
`CatalogGuide: 没有候选形状可以构成（宿主 SourceFileShape，下标 0）`——它们连 `type` 关键字都没进得去，
属于「语句/声明族没有增量壳体」（PLAN §4 的 B4b / A5 面），不是「类型体兜底」。
另 5 条（`as-expression-statement`、`destructure-array-annotation`、`destructure-object-annotation`、
`let-annotation-no-init`、`satisfies-expression-statement`）能解析但树不一致，也另有归属。
**P5 的可验收目标 = §1.2 的 23 条 success 用例**；42 条 todo 的类型形体在 P5 之后由 B4b 复用 T0 的目录即可。

---

## 2. WP 拆分（6 个，文件集合两两不相交）

### 2.0 通用验收模板（下称 **TC**，每个 WP 都跑，不再逐条重复）

```powershell
# 1) 构建
node _tools\xl-build.mjs                                  # errors=0 warnings=0
node node_modules\typescript\bin\tsc -p tsconfig.json      # exit 0
# 2) 账本（必须全绿）
node typescript\cases\tts\run.mjs                          # success 302/302, exit 0
# 3) 本 WP 的兜底归零 + 全量兜底计数
node _coord\probe\tts-probe.mjs --label <WP>               # report-<WP>.json: fallbackIds
# 4) 只影响目标用例（硬门禁）
node _coord\probe\tts-probe.mjs --compare _coord\probe\fp-base.json _coord\probe\fp-<WP>.json
#    changed ⊆ <本 WP 目标 id>，且 added=[] removed=[]
# 5) 收口后每一条 target 单独证明
node typescript\cases\tts\run.mjs typescript\cases\tts\success\types\<case>.ts
```

**禁止**：`npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*` / `cases:*`（本阶段禁跑既有 gates）。
**禁止**改 `core/**`、`typescript/IMPORTANCE.md`、任何 case 的 `.ts` / `.ast`。
**禁止**新建形状类名（复用 `type-node-shapes.xl.md` 既有类名，账本按 `(类名,pos)` 判等）。

---

### T0 — 类型目录地基（factory + 逐字开关 + 各形态片段桩）

- **目标用例**：**0 条**（只建地基）。门禁是「302/302 且 `--compare` 输出 `changed=[] added=[] removed=[]`」。
- **必须新建**（T0 独占，建完即冻结/交接）：
  - `typescript/shapes/types/type-catalog-factory.xl.md` — `TypeCatalogFactory`
    `CreateBody(): Array<PossibleShape>` / `CreateNested(): Array<PossibleShape>` / `AppendFragments(shapes)`；
    每次返回**新实例**；注册区标记 `// [T-CAT:REGISTER]`。
  - `typescript/shapes/types/type-route-util.xl.md` — 逐字开关（**自己一份，不碰 `statement-route-util`**）：
    `static field EnableIncrementalTypes: bool = false` / `static method IsIncrementalTypesEnabled(): bool`。
  - **5 个形态片段桩**（每个只有 `static AppendTo:(shapes:Array<PossibleShape>)=>void` 空实现，返回不加任何东西）：
    `typescript/shapes/types/forms/unary-fragments.xl.md`（→T1）、
    `typescript/shapes/types/forms/literal-fragments.xl.md`（→T2）、
    `typescript/shapes/types/forms/function-fragments.xl.md`（→T3）、
    `typescript/shapes/types/forms/mapped-fragments.xl.md`（→T4）、
    `typescript/shapes/types/forms/recursive-fragments.xl.md`（→T5）。
  - `typescript/tools/type-coverage.mjs` — 薄封装：对 `--allow` 给的 id 集合断言 `fallbackIds ∩ 集合 == ∅`，并打印
    「total / fallback / 按形式分布」，退出码 0/1。（等价于 `_coord/probe/tts-probe.mjs`，但住在实现目录，给 CI 用。）
- **必须修改**（**只此一处，之后冻结**）：
  - `typescript/shapes/types/type-alias-possible-shape.xl.md` — **只改 `:101-114`** 的 `new CatalogGuide([...], endPossible)`：
    候选数组换成 `TypeCatalogFactory.CreateBody()`，`endPossible` 继续用 `new TypeAliasEndPossibleShape()`。
    加注释标记 `// [T-CAT:BUILD]`。
- **不改**：`type-body-util.xl.md`（冻结，各形态只读它的 `IsBodyName` / `IsBodyKeyword` / `HasBodyCode`）、
  `type-alias-declaration-shape.xl.md`、`type-alias-end-possible-shape.xl.md`、`type-node-shapes.xl.md`、`type-parser-api.xl.md`。
- **依赖**：无（W0 第一个，串行）。
- **验收**：TC 全过 + `report-T0.json.fallbackCount == 23`（不改行为）+ `type-coverage.mjs` 可用。

---

### T1 — 一元与叶子族（type-operator / type-query / literal / import-type / parenthesized）

- **目标用例（6 条，逐条可验证）**：
  `success/types/alias-keyof.ts`、`alias-readonly-array.ts`、`alias-typeof-query.ts`、`alias-literal-string.ts`、
  `alias-import-type.ts`、`alias-parenthesized.ts`
- **必须新建（T1 独占）**：
  `typescript/shapes/types/forms/unary-fragments.xl.md`（从 T0 桩接管，写入：
  `TypeOperatorStartPossibleShape`、`TypeQueryStartPossibleShape`、`LiteralTypePossibleShape`、
  `ImportTypePossibleShape`、`ParenthesizedTypePossibleShape`）
  ＋ 必要时 `typescript/shapes/types/forms/unary-shapes.xl.md`（**只放新形状类，且类名必须复用既有名**）。
- **必须修改**：无（`type-alias-possible-shape.xl.md` 已由 T0 冻结；注册在 `unary-fragments.AppendTo` 里完成）。
- **依赖**：T0 之后；**与 T2 / T3 / T4 完全并行**（文件不相交）。
- **验收**：TC + `<6 条 id> 的 fallback == 0` + `--compare` 的 `changed` 恰好是这 6 个 id。
- **备注**：`readonly string[]` 需要 `readonly` 在 **body 起始位**被接受（`TypeAliasOperatorMemberPossibleShape` 只管成员位），
  以及内层 `T[]` 复用既有 `TypeAliasArraySuffixPossibleShape`——**不要复制那份后缀逻辑，改为在新候选里复用同类实例**。

---

### T2 — 复合字面量族（object-literal / tuple 全变体）

- **目标用例（9 条）**：
  `alias-object.ts`、`alias-object-method.ts`、`alias-object-call-construct.ts`、
  `alias-object-index-readonly.ts`、`alias-object-optional-readonly.ts`、
  `alias-tuple.ts`、`alias-tuple-named.ts`、`alias-tuple-optional.ts`、`alias-tuple-rest.ts`
- **必须新建（T2 独占）**：`typescript/shapes/types/forms/literal-fragments.xl.md`（`TypeLiteralStartPossibleShape`、
  `TupleStartPossibleShape`、`TupleElementPossibleShape`、`TupleRestPossibleShape`、`TupleOptionalPossibleShape`）
  ＋ 必要时 `forms/literal-shapes.xl.md`。
- **必须修改（T2 独占）**：`typescript/shapes/types/type-alias-member-possible-shape.xl.md`
  （成员候选要能被**新开的 `{` 之后**的 CatalogGuide 用上；若 T0 的 `CreateNested()` 已能直接复用则**不改**，
  但若改，本文件只归 T2）。
- **依赖**：T0；与 T1 / T3 / T4 并行。
- **验收**：TC + `9 条 fallback == 0` + `--compare changed == 这 9 个 id`。
- **备注**：`{ a: string }` 的 `TypeLiteralShape` 是**容器**，必须把成员挂进它的 `Data` 并保证成员 `Parent/MountedUnit` 正确；
  `alias-object.ts` 只有 23 字节，是这块最便宜的冒烟用例，先打它。

---

### T3 — 函数 / 构造类型族

- **目标用例（3 条）**：`alias-fn-type.ts`、`alias-fn-type-generic.ts`、`alias-ctor-type-abstract.ts`
- **必须新建（T3 独占）**：`typescript/shapes/types/forms/function-fragments.xl.md`
  （`FunctionTypeStartPossibleShape`、`ConstructorTypeStartPossibleShape`、`AbstractConstructorPossibleShape`）
  ＋ 必要时 `forms/function-shapes.xl.md`。
- **必须修改（T3 独占）**：`typescript/shapes/types/type-function-incremental.xl.md`
  （`:60` 的 `ParseCompleteReturnType` 兜底分支必须能**看到**新候选建好的 `FunctionTypeShape`；只改这个分支的判定，
  不动 `=>` 之后那套既有逻辑）。
- **依赖**：T0；与 T1 / T2 / T4 并行。（`alias-fn-type` 是全 23 条里**唯一**用 `ParseCompleteReturnType` 的，
  也是唯一有 `ParseParameterPrefix` 的，落在 T3 内部，不会外溢。）
- **验收**：TC + `3 条 fallback == 0` + `--compare changed == 这 3 个 id`。

---

### T4 — 映射 / 模板 / 索引族

- **目标用例（4 条）**：`alias-mapped.ts`、`alias-mapped-modifiers.ts`、`alias-mapped-remap.ts`、`alias-template-literal.ts`
- **必须新建（T4 独占）**：`typescript/shapes/types/forms/mapped-fragments.xl.md`
  （`MappedTypeStartPossibleShape`、`MappedKeyPossibleShape`、`MappedModifierPossibleShape`、`MappedRemapPossibleShape`、
  `TemplateLiteralTypePossibleShape`、`IndexedAccessPossibleShape`）＋ 必要时 `forms/mapped-shapes.xl.md`。
- **必须修改**：无。
- **依赖**：**T0 且 T1**（mapped 的 `[K in keyof T]` 需要 T1 的 `keyof` 在 body 起始位能被接受）；
  与 T2 / T3 并行（文件不相交）。
- **验收**：TC + `4 条 fallback == 0` + `--compare changed == 这 4 个 id`。
- **备注**：这 4 条是 23 条里最长的（49/50 字节）且 `ParseTypeParameterOnly` / `ParseCompleteType` 的二次兜底全在这里，
  是**风险最高**的一个 WP；建议 T4 开工前先把 `alias-mapped.ts` 单独打绿，再吃 modifiers/remap。

---

### T5 — 收口：递归体 + 兜底降级为显式 throw + 全量归零

- **目标用例（1 条）**：`alias-recursive.ts`（`type A = { next: A | null }`，需要 T2 的 `{` 与既有 union/引用）
- **必须新建（T5 独占）**：`typescript/shapes/types/forms/recursive-fragments.xl.md`（从桩接管）
  ＋ `typescript/shapes/types/type-fallback-guard.xl.md`（`TypeFallbackGuard.Hit(phase, form)`：
  开关关→照旧 `ParseAlias`；开关开→`throw new Error("增量变量形状未支持：type <形态>")`，文案按 PLAN §7.5）。
- **必须修改（T5 独占）**：
  - `typescript/shapes/types/type-alias-declaration-shape.xl.md`（`:51` 的 `ParseAlias` 分支 → `TypeFallbackGuard`）
  - `typescript/shapes/types/type-alias-end-possible-shape.xl.md`（`:92` 同样收口）
- **依赖**：T1 + T2 + T3 + T4 **全部合并之后**（唯一串行收口点）。
- **验收**：TC + `report-T5.json.fallbackCount == 0`（success 全量）
  + `--compare changed == {alias-recursive}`（其余 22 条在 T1–T4 已经改过，比对的基线要用 **T0 之后的 fp**：
  即 T5 的 base 是 `fp-T4.json` 而不是 `fp-base.json`——见 §5 的逐波基线）。
  + 打开 `EnableIncrementalTypes=true` 后 302 仍 302（证明没有「未覆盖形态被静默放过」）。

---

### WP 总表

| WP | 名称 | 目标用例数 | 新建（own） | 修改（own） | 依赖 | 建议轮 |
|---|---|---|---|---|---|---|
| **T0** | 类型目录地基 | 0 | `type-catalog-factory.xl.md`、`type-route-util.xl.md`、`forms/{unary,literal,function,mapped,recursive}-fragments.xl.md`、`tools/type-coverage.mjs` | `type-alias-possible-shape.xl.md`（仅 :101-114） | — | 5 |
| **T1** | 一元与叶子族 | 6 | `forms/unary-fragments.xl.md`（填桩）、`forms/unary-shapes.xl.md`? | — | T0 | 6 |
| **T2** | 复合字面量族 | 9 | `forms/literal-fragments.xl.md`（填桩）、`forms/literal-shapes.xl.md`? | `type-alias-member-possible-shape.xl.md` | T0 | 7 |
| **T3** | 函数/构造族 | 3 | `forms/function-fragments.xl.md`（填桩）、`forms/function-shapes.xl.md`? | `type-function-incremental.xl.md` | T0 | 6 |
| **T4** | 映射/模板/索引族 | 4 | `forms/mapped-fragments.xl.md`（填桩）、`forms/mapped-shapes.xl.md`? | — | T0, T1 | 8 |
| **T5** | 收口 | 1 | `forms/recursive-fragments.xl.md`（填桩）、`type-fallback-guard.xl.md` | `type-alias-declaration-shape.xl.md`、`type-alias-end-possible-shape.xl.md` | T1..T4 | 6 |

合计目标用例 6+9+3+4+1 = **23** = §1.2 全部兜底用例，无重叠、无遗漏。

---

## 3. 共享文件仲裁

被多方觊觎的文件只有三个，仲裁如下：

### 3.1 `type-alias-possible-shape.xl.md` —— **唯一所有者：T0**，合并后**永久冻结**

问题：它的 `:101-114` 是全仓库**唯一**构造 `TypeAliasDeclarationShape` 的 `CatalogGuide` 的地方。
若允许各形态 WP 往这个数组里各加一行，5 个 WP 就会在同一个 20 行区块里冲突（PLAN §5.1 已经踩过这个坑）。

仲裁办法（**结构性避免，不靠纪律**）：

1. T0 把 `:101-114` 的候选数组整体替换为 `TypeCatalogFactory.CreateBody()`，并声明本文件此后**任何 WP 不得修改**。
2. `TypeCatalogFactory.CreateBody()` 的实现固定为「按 WP id 顺序调用 5 个片段的 `AppendTo`」：

```ts
const shapes: Array<PossibleShape> = [
  new TypeParameterListOpenPossibleShape(),
  new TypeAliasBodyPossibleShape(),
  new TypeAliasBodyKeywordPossibleShape(),
  new TypeAliasArraySuffixPossibleShape(),
  new TypeAliasMemberPossibleShape(),
  new TypeAliasIndexPossibleShape(),
  new TypeAliasOperatorMemberPossibleShape(),
  new TypeAliasChainPossibleShape(),
];
UnaryFragments.AppendTo(shapes);      // [T1]
LiteralFragments.AppendTo(shapes);    // [T2]
FunctionFragments.AppendTo(shapes);   // [T3]
MappedFragments.AppendTo(shapes);     // [T4]
RecursiveFragments.AppendTo(shapes);  // [T5]
return shapes;
```

3. T0 在 W0 就把 5 个片段文件**全部建好（空实现）**，所以 `type-catalog-factory.xl.md` 从 T0 交付那一刻起**再也不需要改**；
   T1–T5 只写自己那一个片段文件。**注册区不是「追加式」而是「预先分配式」**——这是与表达式侧
   `[E-CAT:FRAGMENTS]` 追加式注册区最大的不同，也是本文要求的更强约束（追加式在 4 个并行 WP 下仍会冲突，预分配式不会）。

### 3.2 `type-alias-declaration-shape.xl.md` —— **唯一所有者：T5**

- `:51` 的 `ParseAlias` 分支是兜底本体。T1–T4 **一行都不改**：它们靠「让 `HasBuiltType()` 变真」来绕过这个分支，
  不需要动它。所以 T1–T4 全程不碰此文件，T5 收口时才动。
- T0 也不碰（T0 只改 `type-alias-possible-shape` 那一处）。
- 阅读契约：T1–T4 可以只读 `HasBuiltType()`（`:73-87`），不改。

### 3.3 `type-parser-api.xl.md` —— **无人所有，P5 全程冻结**

- 它是 `TypeParser` 的门面，被 `type-conditional-*`、`type-alias-*`、`type-function-incremental` 多处调用；
  改签名会外溢到 P5 范围之外。
- 仲裁：**P5 任何 WP 不得修改**。T5 只通过新建的 `type-fallback-guard.xl.md` 包住调用点（`:51` / `:92`），
  `TypeParserApi` 本身保持原样，继续服务默认路径（`EnableIncrementalTypes=false`）。
- 若某 WP 认为必须新增静态方法：先停下报告 Lead，由 Lead 决定是否开一个独立 WP（本方案不开）。

### 3.4 其它可能争议的文件（一并裁定）

| 文件 | 归属 | 规则 |
|---|---|---|
| `type-body-util.xl.md` | **冻结（P5 无人写）** | 五个 `Is*` 判据已是共享只读 API；新形态在**自己的片段文件里**做判定 |
| `type-node-shapes.xl.md` | **冻结** | 形状类已齐（§1.4）。确需新类时**放进自己 WP 的 `forms/<x>-shapes.xl.md`**，绝不改此文件 |
| `type-alias-member-possible-shape.xl.md` | **T2** | 只有 T2 可改 |
| `type-function-incremental.xl.md` | **T3** | 只有 T3 可改 |
| `type-conditional-chain.xl.md` | **冻结** | 条件链已通（`alias-conditional*` / `alias-template-infer` 全绿），P5 不动 |
| `type-parameter-list-shape.xl.md`、`type-alias-grow-util`、`type-revision-util`、`type-keyword-util`、`type-balance-util`、`type-alias-end-util`、`type-shape`、`type-token-shapes`、`keyword-type-shapes`、`type-parser`、`type-parser-result` | **冻结** | 只读 |
| `statement-route-util.xl.md` | **不属于 P5** | 逐字开关放 T0 自己的 `type-route-util.xl.md`，避免与 A5/B4b 抢同一个文件 |
| `typescript/cases/tts/**` | **不属于 P5** | 23 条用例的 `.ts` / `.ast` **一个字都不改**（P5 不新建用例，只让既有用例走增量） |

---

## 4. 风险与回退

### 4.1 哪些改动可能改变既有 case 的逐字树

| 风险 | 影响面 | 为什么可能变 | 对策 |
|---|---|---|---|
| **R1 `Pos` 差 1** | 目标用例 | 新形状自己 `Pos` 赋值算错（body 起始位、`{` 之后首成员、`[` 之后首元素） | 复用 `StatementUtil.StartIndex` / `ItemUtil.PositionOf`；账本按 `(类名,pos)` 判等，pos 错立刻 divergent |
| **R2 `CreatedAt` 提前** | 目标用例（**这是收益**） | 形状在字符到达时就建，`CreatedAt` 从 Close 时刻前移 | 唯一被允许变化的非结构量；§1.5 的 raw>2 名单必须**变短**，不会变长 |
| **R3 `Data` 里残留 intermediate** | 目标用例 | 候选建出的临时形状没有在收口前替换/卸载 | `Close` 里的 `Data.filter(IsTriviaToken/IsBasicToken)` 已有；新候选**禁止**把自己留在 `Data` 里 |
| **R4 `;` / 下一条语句被吞** | 目标用例 + **可能外溢到非 types** | `TypeAliasEndPossibleShape.BuildByIndex` 的 `splice` + `tail` 重挂：一旦 `HasBuiltType()` 提前变真，走的分支从「ParseAlias + Apply」变成「TryToClose」，`tail` 的计算前提变了 | T5 只改 `:89` 的判定入口，**`splice`/`tail` 那段（:80-108）一字不动**；单独用 2 条语句的样本（`type A = X; type B = Y`）自测 |
| **R5 CatalogGuide 候选变多 → 别处 Accept** | **全量 302** | `CreateBody()` 里的候选如果在**非 alias 宿主**上也 Accept，会污染别的上下文的树 | 每个候选 `ComputeByIndex` 第一件事必须是 `if (!(host instanceof TypeAliasDeclarationShape)) return ShapeStates.Reject;`（照抄 `TypeAliasBodyPossibleShape:128` 的判据） |
| **R6 候选把 `Reject` 当 `Uncertain` 用（或反之）** | 目标用例 | `Reject` 会把候选永久移除，`Uncertain` 留到下一格 | 口径写死：能建=Accept，暂不能=Uncertain，**本形态永不可能**才 Reject；不支持=throw（PLAN §7.2） |
| **R7 性能** | 全量 | 每字符多 ~10 个候选 × 302 case | 预算：`run.mjs` 全量 < 3s（现约 1.5s）；候选判据必须先做 O(1) 短路（`host instanceof` 最先） |

### 4.2 怎么用指纹证明「只影响目标用例」

核心是 **`_coord/probe/tts-probe.mjs` 的逐字指纹 + `--compare`**，它是唯一证据，不接受「看起来没变」：

```powershell
node _coord\probe\tts-probe.mjs --label T2
node _coord\probe\tts-probe.mjs --compare _coord\probe\fp-T0.json _coord\probe\fp-T2.json
```

判定规则（写进每个 PR 的验收）：

1. `added == []` 且 `removed == []`（不许有 case 消失或新增）。
2. `changed` 的 id 集合 **⊆ 本 WP 的目标清单**（多一个就是 R5/R4 外溢，打回）。
3. `changed[i].firstChar` 必须 **≥ `type` 之后 body 起点的字符下标**——若在 `type` 关键字本身或更早发生变化，
   说明污染了 alias 的建立时机（R5），打回。
4. `same` 的数量 = 302 − |target|（T0 是 302，T5 是 301）。
5. 另跑一次 `run.mjs`（账本）302/302 —— 指纹只证明「变了哪些」，账本证明「变了也还是对的树」。

### 4.3 回退

- **单 WP 回退**：文件集合两两不相交 ⇒ `git revert <该 WP 的 commit>` 不会碰到别人的文件，
  回退后 `fp-*` 恢复到上一波基线，账本仍 302/302。
- **全局回退**：`EnableIncrementalTypes = false`（`type-route-util.xl.md`，默认就是 false）⇒ 逐字增量目录整体不启用，
  行为回到 HEAD 的「Close 全量 ParseAlias」。**这是 T0 就必须落地的安全阀**，也是为什么开关单独一份、不复用
  `EnableIncrementalVariableShapes` / `EnableIncrementalShapes`（那两个已被别的 WP 的语义钉死）。
- **T5 之后的回退**：`TypeFallbackGuard` 的 throw 只在开关开时触发；开关关 ⇒ 仍走 `ParseAlias`，
  所以「收口」这一步本身也可用开关一键退回。

---

## 5. 波次与合并顺序（给 Lead）

| 波 | 并行 WP | 合并顺序 | 说明 |
|---|---|---|---|
| **W0** | T0 | 1（串行） | 地基：factory + 开关 + 5 个空片段桩 + `type-coverage.mjs`。**T0 不合，谁都不能开工。**合并后立刻冻结 `type-alias-possible-shape.xl.md` |
| **W1** | T1、T2、T3 | T1 → T2 → T3 | 三个 WP 文件集合不相交，可真正并行；合并顺序只影响 rebase 成本，不影响正确性 |
| **W2** | T4 | 4 | 依赖 T1（`keyof`），必须等 T1 合并后 rebase。**若轮次紧，T4 可与 W1 的 T2/T3 并行开工、在 T1 合并后 rebase** |
| **W3** | T5 | 5（串行） | 唯一收口点：需要 T1–T4 全部合并；把兜底降级为 throw + 打绿 `alias-recursive` + 全量 `fallback == 0` |

**逐波基线（重要，否则 `--compare` 会误报）**：

| 波 | 该波 `--compare` 的 base 文件 | 期望 `changed` |
|---|---|---|
| W0 | `fp-base.json` | `[]` |
| W1 | `fp-T0.json`（T0 之后重跑一次生成） | 各自目标 id |
| W2 | `fp-T1.json` 或 `fp-T3.json`（W1 合并后的终点） | T4 的 4 个 id |
| W3 | `fp-T4.json`（W2 之后的终点） | `[alias-recursive]` |

即：**每一波开始时，Lead 在合并后的 `integration/p5` 上重跑一次 `tts-probe.mjs --label W<n>-base`，作为下一波的 base。**

**合并纪律**：
1. 每个 WP 一个分支 → PR 到 `integration/p5`；Lead 是唯一 merge sheriff。
2. 冲突只可能出现在 `type-catalog-factory.xl.md`（T0 一次成型后不再变）与 `type-alias-possible-shape.xl.md`（T0 改完冻结）。
   **一旦 W1 之后有人动了这两个文件 ⇒ 所有权违规，直接打回重做，不手工合并。**
3. 报告写 `_coord/REPORT-p5-<WP>.md`，1 WP 1 文件，永不冲突。
4. 超过 8 轮：在 round 6 前 commit 一个「可构建 + 账本 302/302 + 目标未全达成」的检查点，写报告三件事
   （已完成 / 未达成 + `--show` 输出 / 下一步），后继 WP 从 `integration/p5` 该 commit 接着做。

**建议最先做的两个 WP**：

- **T0（必做第一步）**：它是唯一的串行瓶颈，也是「预分配式注册区」这个防冲突机制的落地处。
  T0 交付后，T1–T4 才可能真正并行且互不相干；T0 不交付，任何形态 WP 都会去抢 `type-alias-possible-shape.xl.md` 的同一段代码。
- **T1（第二优先，而非 T2）**：虽然 T2 用例最多（9 条），但 **T1 是最便宜的确定性收益**——6 条全是
  「body 起始一个关键字/一个符号」的一元形态（`keyof` / `typeof` / `"a"` / `import(` / `(` / `readonly`），
  形状类全都在 `type-node-shapes.xl.md` 里现成，不需要新的容器挂载逻辑；
  而且 **T4 依赖 T1 的 `keyof`**，T1 不做 T4 就起不来。T1 还是「一个候选负责一格」的样板，
  T2/T3/T4 直接照抄它的 `ComputeByIndex` 三态写法，能显著降低后续三个 WP 的返工率。

---

## 附录 A：探针产物清单（`_coord/probe/`，只读工具，不进实现目录）

| 文件 | 作用 |
|---|---|
| `tts-probe.mjs` | 主探针：patch `TypeParserApi` 9 个静态方法 → 每 case 的兜底次数/调用点；ts AST 形式分类；`IdentifierShape` 偏差直方图；逐字树指纹 |
| `analyze.mjs` | 从 `fp-*.json` / `report-*.json` 生成 §1.2 / §1.3 / §1.6 的表 |
| `report-base.json` / `fp-base.json` | `success` 302 条的基线（W0 的 compare base） |
| `report-todo.json` / `fp-todo.json` | `todo` 285 条的基线（证明 §1.7 的边界） |

## 附录 B：与 `PLAN-all-possible.md` 的关系

- P5 = PLAN §4.1 的 **A5（类型面）+ B4b-i/ii（类型形态）里「类型体逐字构建」这一条竖切**，
  但**只做 success 里已经被 legacy 打绿的 23 条**，不改账本、不迁移用例。
- 与 A5 的冲突点：A5 的 own 文件里有 `types/type-catalog-factory.xl.md`（PLAN §4.1）。
  **本文的 T0 就是那个文件**，若 A5 先落地则 T0 退化为「只加 5 个片段桩 + `type-route-util`」，反之亦然——
  **同一个文件同一时刻只有一个所有者**这条铁律不变，两方案合并时以先合并者为准，后到者 rebase。
- 与 `statement-route-util` 的关系：P5 **不碰**它（开关自建 `type-route-util.xl.md`），
  所以与 A5/B4b 之外的任何 WP 都没有共享文件。
