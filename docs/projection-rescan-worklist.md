# 投影层重扫工单

由 `python tmp/pa-worklist.py` 生成；逐处明细在 `tmp/pa-worklist.tsv`。
源：`typescript/print-ast-common.xl.md`（9911 行）。

判据：**投影层不许从子单元里重建「token 成形时就已经算出来的答案」**。
每一行要回答的只有一个问题：这个答案，成形时那一格算过没有？

| 惯用法 | 处数 | 方法数 | 最多的方法 |
| --- | ---: | ---: | --- |
| A 坐标再问 | 254 | 34 | projectExpression 84 · chainOnto 30 · chainWithOptional 29 |
| B 摊开一格 | 11 | 6 | projectExpression 3 · projectTypeExpression 3 · functionTypeProps 2 |
| C 取子格 | 161 | 43 | projectExpression 58 · chainWithOptional 17 · chainOnto 17 |
| D 按标签筛 | 100 | 38 | projectExpression 21 · chainOnto 12 · chainWithOptional 9 |
| E 在序列里找 | 66 | 17 | projectTypeExpression 19 · projectBindingElement 9 · projectLetFrom 7 |
| F 切序列 | 137 | 25 | projectExpression 72 · projectTypeExpression 8 · foldBinaryFrom 7 |
| G 回原文取文本 | 118 | 38 | projectExpression 29 · projectTypeExpression 10 · projectExport 9 |
| H 直接扫原文 | 40 | 22 | blockOfBody 6 · projectRoot 4 · synthName 3 |

合计 **887 处**重扫。

## A 坐标再问（254 处）

> 对一个已经投影出来的节点/视图再问坐标（它的 token 上本来就有）

- **projectExpression** 84 处（行 2390、2393、2466、2476、2497、2521、2522、2538、2556、2557、2617、2618…）；问到的标签：`String`
- **chainOnto** 30 处（行 6165、6168、6184、6206、6224、6249、6252、6260、6269、6307、6340、6346…）；问到的标签：`String`
- **chainWithOptional** 29 处（行 5607、5616、5641、5680、5689、5697、5701、5709、5717、5721、5724、5734…）
- **projectTypeExpression** 21 处（行 7699、7700、7724、7777、7804、7805、7857、7873、7892、7918、7953、7959…）
- **projectBindingElement** 10 处（行 7379、7388、7394、7395、7398、7410、7427、7433、7451、7452）；问到的标签：`ArrayLiteral`
- **namedExportClause** 10 处（行 8990、8991、8997、8998、9005、9006、9027、9028、9059、9060）
- **foldBinaryFrom** 8 处（行 6791、6795、6854、6863、6869、6870、6905、6951）
- **projectString** 5 处（行 733、762、763、775、777）
- **assertedMember** 5 处（行 5405、5422、5447、5476、5484）
- **innermostCallee** 4 处（行 5558、5572、5584、5592）
- **projectEachIn** 3 处（行 1419、1431、1434）
- **projectEach** 3 处（行 1547、1574、1576）
- **projectHeadDeclare** 3 处（行 7122、7124、7125）
- **projectExport** 3 处（行 8833、8834、8888）
- **bodyBlockOf** 3 处（行 9125、9134、9142）
- **blockOfBody** 3 处（行 9182、9229、9230）
- **structuralProps** 3 处（行 9497、9498、9511）
- **astNode** 2 处（行 1018、1021）；问到的标签：`AreaAnnotation` `LineAnnotation`
- **projectStatement** 2 处（行 2029、2030）
- **operatorTokenOf** 2 处（行 2324、2325）
- **parenthesizedOf** 2 处（行 5138、5139）
- **projectLetFrom** 2 处（行 7233、7268）
- **memberNameOf** 2 处（行 8342、8343）
- **namedSpecifiersOf** 2 处（行 8611、8612）
- **conditionalNode** 2 处（行 8700、8701）
- **statementOfList** 2 处（行 9617、9618）
- **projectRoot** 2 处（行 9742、9743）
- **synthName** 1 处（行 581）
- **labeled** 1 处（行 1685）
- **trailingSemicolonOf** 1 处（行 2243）
- **projectBindingPattern** 1 处（行 7316）
- **projectSignedLiteralType** 1 处（行 7558）
- **nameOf** 1 处（行 7600）
- **computedNameUnit** 1 处（行 9402）

## B 摊开一格（11 处）

> 把一个单元摊开成子单元再看

- **projectExpression** 3 处（行 2384、2599、2987）；问到的标签：`TypeParameter`
- **projectTypeExpression** 3 处（行 7910、7980、7985）；问到的标签：`TypeParameter`
- **functionTypeProps** 2 处（行 7635、7643）；问到的标签：`TypeParameter`
- **projectSegment** 1 处（行 8517）
- **structuralProps** 1 处（行 9545）
- **projectRoot** 1 处（行 9806）

## C 取子格（161 处）

> 重新取子单元列表

- **projectExpression** 58 处（行 2471、2493、2496、2663、2677、2858、2919、2968、3045、3071、3136、3209…）；问到的标签：`NullConditionalOperator` `PropertyAccess`
- **chainWithOptional** 17 处（行 5612、5631、5693、5713、5748、5754、5772、5804、5828、5853、5919、5946…）
- **chainOnto** 17 处（行 6178、6200、6220、6237、6247、6256、6282、6327、6336、6404、6466、6479…）
- **projectTypeExpression** 10 处（行 7789、7867、7886、7898、7931、7949、8058、8088、8110、8113）；问到的标签：`ArrayType` `GenericType`
- **projectStatement** 4 处（行 1882、2014、2024、2028）
- **assertedMember** 4 处（行 5387、5403、5418、5430）
- **projectRoot** 4 处（行 9721、9760、9772、9811）
- **isCallFirstUnit** 3 处（行 5301、5306、5337）
- **namedSpecifiersOf** 3 处（行 8638、8650、8659）
- **projectSwitchClause** 3 处（行 8758、8763、8766）
- **projectString** 2 处（行 725、745）
- **projectNode** 2 处（行 1130、1141）
- **innermostCallee** 2 处（行 5581、5588）
- **projectExport** 2 处（行 8812、8825）
- **namedExportClause** 2 处（行 8959、8976）
- **synthName** 1 处（行 578）；问到的标签：`Decorator`
- **allKids** 1 处（行 639）
- **unwrapNodes** 1 处（行 646）
- **wrapperTarget** 1 处（行 872）；问到的标签：`TypeParameter`
- **astNode** 1 处（行 1016）
- **astMembers** 1 处（行 1069）
- **projectEachIn** 1 处（行 1376）
- **trailingTriviaStart** 1 处（行 1738）
- **trailingSemicolonOf** 1 处（行 2246）
- **parenthesizedOf** 1 处（行 5134）
- **isIndexFirstUnit** 1 处（行 5225）
- **isBareCallMethod** 1 处（行 5249）
- **innermostMethod** 1 处（行 5503）
- **projectLetFrom** 1 处（行 7210）
- **projectBindingPattern** 1 处（行 7306）
- **projectBindingElement** 1 处（行 7354）
- **projectSignedLiteralType** 1 处（行 7539）
- **projectTypeArguments** 1 处（行 8157）
- **memberNameOf** 1 处（行 8359）；问到的标签：`Identifier`
- **addDecorators** 1 处（行 8427）
- **projectSegment** 1 处（行 8496）
- **computedNameUnit** 1 处（行 9398）
- **computedNameExpression** 1 处（行 9408）
- **projectableKids** 1 处（行 9585）
- **labelIsFlat** 1 处（行 9600）
- **stringText** 1 处（行 9629）；问到的标签：`ConstString`
- **moduleSpecifierIn** 1 处（行 9873）
- **moduleHolderOf** 1 处（行 9891）

## D 按标签筛（100 处）

> 在子单元里按标签筛

- **projectExpression** 21 处（行 2352、2384、2893、2987、3164、3198、3232、3238、3426、3442、4412、4449…）；问到的标签：`As` `BinaryOperator` `NullConditionalOperator` `Satisfies` `TypeParameter`
- **chainOnto** 12 处（行 6222、6237、6258、6282、6327、6338、6406、6466、6479、6518、6620、6665）
- **chainWithOptional** 9 处（行 5631、5695、5715、5756、5806、5946、5984、6004、6063）
- **projectTypeExpression** 8 处（行 7679、7790、7791、7820、7910、7980、7986、8058）；问到的标签：`ArrayType` `Parameter` `TypeParameter`
- **projectExport** 6 处（行 8825、8845、8863、8864、8866、8872）；问到的标签：`Keyword` `SymbolToken`
- **computedNameExpression** 3 处（行 9408、9409、9410）
- **synthName** 2 处（行 569、578）；问到的标签：`Decorator`
- **projectString** 2 处（行 726、727）；问到的标签：`ConstString` `InterpolationString`
- **projectEachIn** 2 处（行 1376、1384）
- **projectStatement** 2 处（行 2046、2052）
- **isCallFirstUnit** 2 处（行 5301、5306）
- **assertedMember** 2 处（行 5387、5420）
- **innermostCallee** 2 处（行 5581、5590）
- **addDecorators** 2 处（行 8428、8430）；问到的标签：`Decorator`
- **projectSegment** 2 处（行 8517、8524）
- **kidsOf** 1 处（行 627）
- **unwrapNodes** 1 处（行 646）
- **wrapperTarget** 1 处（行 872）；问到的标签：`TypeParameter`
- **projectNode** 1 处（行 1216）
- **typeMemberGroups** 1 处（行 1324）
- **projectEach** 1 处（行 1470）
- **isBareCallMethod** 1 处（行 5249）
- **innermostMethod** 1 处（行 5503）
- **projectHeadDeclare** 1 处（行 7079）
- **projectLetFrom** 1 处（行 7278）
- **projectBindingElement** 1 处（行 7358）
- **modifierStart** 1 处（行 7497）
- **functionTypeProps** 1 处（行 7643）；问到的标签：`TypeParameter`
- **addModifiers** 1 处（行 8458）
- **namedSpecifiersOf** 1 处（行 8610）
- **projectSwitchClause** 1 处（行 8766）
- **bodyBlockOf** 1 处（行 9105）
- **blockOfBody** 1 处（行 9163）
- **splitTopLevel** 1 处（行 9358）
- **typeOf** 1 处（行 9385）
- **structuralProps** 1 处（行 9476）
- **projectableKids** 1 处（行 9585）
- **projectRoot** 1 处（行 9843）

## E 在序列里找（66 处）

> 在序列里线性找一个单元

- **projectTypeExpression** 19 处（行 7692、7711、7748、7781、7850、7864、7883、7922、7923、7931、7950、7962…）；问到的标签：`ArrayType` `Bracket` `GenericType` `Identifier` `IndexedAccessType` `Keyword` `PropertyAccess` `SymbolToken` `TypeDefine` `TypePredicate`
- **projectBindingElement** 9 处（行 7355、7356、7357、7376、7386、7398、7407、7426、7433）；问到的标签：`SymbolToken`
- **projectLetFrom** 7 处（行 7154、7203、7210、7220、7247、7253、7267）；问到的标签：`Let` `SymbolToken` `TypeDefine`
- **conditionalNode** 6 处（行 8695、8696、8697、8714、8715、8716）
- **namedExportClause** 6 处（行 8977、8981、8985、9003、9019、9021）；问到的标签：`ConstString` `String` `SymbolToken`
- **functionTypeProps** 3 处（行 7620、7624、7625）；问到的标签：`GenericType` `Keyword`
- **projectStatement** 2 处（行 2021、2022）；问到的标签：`Bracket`
- **projectExpression** 2 处（行 3154、4982）；问到的标签：`As` `NullConditionalOperator` `Satisfies`
- **assertedMember** 2 处（行 5388、5389）；问到的标签：`SymbolToken`
- **chainWithOptional** 2 处（行 5881、5883）；问到的标签：`ConstString` `String`
- **projectSwitchClause** 2 处（行 8759、8760）；问到的标签：`SwitchCase` `SwitchStatement`
- **astNode** 1 处（行 1016）
- **projectNode** 1 处（行 1223）
- **memberNameOf** 1 处（行 8359）；问到的标签：`Identifier`
- **namedSpecifiersOf** 1 处（行 8618）
- **projectExport** 1 处（行 8819）
- **stringText** 1 处（行 9629）；问到的标签：`ConstString`

## F 切序列（137 处）

> 按下标切/找序列

- **projectExpression** 72 处（行 2499、2526、2530、2531、2549、2560、2637、2689、2698、2725、2726、2814…）；问到的标签：`BinaryOperator` `NullConditionalOperator`
- **projectTypeExpression** 8 处（行 7717、7721、7770、7772、7849、8010、8091、8115）
- **foldBinaryFrom** 7 处（行 6785、6791、6854、6863、6892、6908、6942）
- **projectStatement** 6 处（行 1913、1935、1986、2008、2043、2062）
- **chainWithOptional** 5 处（行 5841、5873、5906、5907、6124）
- **conditionalNode** 5 处（行 8692、8703、8706、8710、8713）
- **synthName** 3 处（行 514、571、583）
- **projectString** 3 处（行 740、762、763）
- **addModifiers** 3 处（行 8475、8483、8485）
- **blockOfBody** 3 处（行 9187、9213、9238）
- **projectEach** 2 处（行 1574、1576）
- **projectLetFrom** 2 处（行 7204、7226）
- **projectBindingElement** 2 处（行 7375、7444）
- **functionTypeProps** 2 处（行 7623、7648）
- **memberNameOf** 2 处（行 8357、8377）
- **projectExport** 2 处（行 8897、8905）
- **namedExportClause** 2 处（行 8981、8984）
- **textOfNode** 1 处（行 655）
- **textOf** 1 处（行 662）
- **functionContextOf** 1 处（行 949）
- **projectNode** 1 处（行 1226）
- **semicolonEndOf** 1 处（行 2220）
- **modifierStart** 1 处（行 7511）
- **namedSpecifiersOf** 1 处（行 8616）
- **bodyBlockOf** 1 处（行 9126）

## G 回原文取文本（118 处）

> 回原文取文本（成形时那一段本来就在手上）

- **projectExpression** 29 处（行 2378、2380、2607、2709、2713、2765、2815、2879、2897、2949、2955、2972…）；问到的标签：`GenericType` `Identifier` `Lamda` `SymbolToken`
- **projectTypeExpression** 10 处（行 7680、7693、7705、7749、7758、7952、7974、7975、8021、8114）；问到的标签：`Keyword` `SymbolToken`
- **projectExport** 9 处（行 8828、8831、8832、8845、8856、8861、8863、8868、8873）；问到的标签：`Keyword` `SymbolToken`
- **foldBinaryFrom** 6 处（行 6768、6780、6793、6853、6918、6937）
- **projectBindingElement** 6 处（行 7355、7356、7357、7415、7449、7450）；问到的标签：`SymbolToken`
- **projectLetFrom** 4 处（行 7162、7203、7220、7253）；问到的标签：`SymbolToken`
- **namedExportClause** 4 处（行 8973、8978、9019、9021）；问到的标签：`SymbolToken`
- **projectStatement** 3 处（行 2020、2047、2060）；问到的标签：`Keyword`
- **chainWithOptional** 3 处（行 5780、5947、6005）；问到的标签：`SymbolToken`
- **chainOnto** 3 处（行 6238、6328、6467）；问到的标签：`SymbolToken`
- **functionTypeProps** 3 处（行 7621、7625、7630）；问到的标签：`Keyword` `SymbolToken`
- **namedSpecifiersOf** 3 处（行 8615、8621、8653）；问到的标签：`Identifier` `Keyword`
- **projectRoot** 3 处（行 9726、9727、9728）
- **projectString** 2 处（行 724、728）
- **projectEachIn** 2 处（行 1387、1437）；问到的标签：`SymbolToken`
- **projectEach** 2 处（行 1474、1530）；问到的标签：`SymbolToken`
- **isPrefixOperatorUnit** 2 处（行 6744、6747）
- **angleAssertionLength** 2 处（行 6980、6986）；问到的标签：`SymbolToken`
- **projectHeadDeclare** 2 处（行 7089、7118）
- **conditionalNode** 2 处（行 8691、8694）；问到的标签：`Identifier` `Keyword` `SymbolToken`
- **typeMemberGroups** 1 处（行 1316）；问到的标签：`SymbolToken`
- **isOperatorUnit** 1 处（行 2304）
- **operatorTokenOf** 1 处（行 2317）
- **isCallFirstUnit** 1 处（行 5307）；问到的标签：`SymbolToken`
- **assertedMember** 1 处（行 5388）；问到的标签：`SymbolToken`
- **projectBindingPattern** 1 处（行 7314）；问到的标签：`SymbolToken`
- **projectSignedLiteralType** 1 处（行 7543）
- **isTypeSeparator** 1 处（行 7570）
- **isDot** 1 处（行 7576）；问到的标签：`SymbolToken`
- **nameOf** 1 处（行 7599）
- **projectTypeArguments** 1 处（行 8158）；问到的标签：`SymbolToken`
- **memberNameOf** 1 处（行 8359）；问到的标签：`Identifier`
- **projectSegment** 1 处（行 8525）；问到的标签：`SymbolToken`
- **specifierNameOf** 1 处（行 8673）
- **splitTopLevel** 1 处（行 9350）；问到的标签：`SymbolToken`
- **isTypeParameterModifier** 1 处（行 9372）
- **structuralProps** 1 处（行 9509）
- **stringText** 1 处（行 9630）

## H 直接扫原文（40 处）

> 直接扫原文找配对/跳过 trivia

- **blockOfBody** 6 处（行 9186、9187、9213、9221、9233、9238）
- **projectRoot** 4 处（行 9774、9775、9778、9794）
- **synthName** 3 处（行 514、571、583）
- **projectString** 3 处（行 740、762、763）
- **foldBinaryFrom** 3 处（行 6791、6854、6863）
- **projectStatement** 2 处（行 1913、1935）
- **skipSourceTrivia** 2 处（行 8539、8543）
- **projectExport** 2 处（行 8897、8905）
- **bodyBlockOf** 2 处（行 9126、9133）
- **cangjie** 1 处（行 45）
- **textOfNode** 1 处（行 655）
- **textOf** 1 处（行 662）
- **functionContextOf** 1 处（行 949）
- **projectEach** 1 处（行 1574）
- **semicolonEndOf** 1 处（行 2220）
- **modifierStart** 1 处（行 7511）
- **memberNameOf** 1 处（行 8377）
- **addModifiers** 1 处（行 8483）
- **firstCodeAfter** 1 处（行 8531）
- **matchBrace** 1 处（行 8571）
- **matchingBrace** 1 处（行 9259）
- **matchingParenOf** 1 处（行 9296）

