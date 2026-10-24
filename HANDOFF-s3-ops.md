# HANDOFF 鈥?S3a + S3b锛堣〃杈惧紡浣撳閲忕姸鎬佹満锛氭搷浣滄暟鍙跺瓙 + 浜屽厓杩愮畻绗︼級

鍒嗘敮锛歚feature/possible-statement-s3-ops`锛堝熀浜?`origin/feature/possible-statement` @ `a07c74ce`锛?鏂瑰悜锛氳璁℃枃妗?`docs/possible-statement-design.md` 搂4.2/搂4.3锛圫3a/S3b锛変笌 搂11 鍐荤粨鎺ュ彛銆?鏈**鍙姩鑷繁鍒嗘敮**锛屼笉鍔?`core/`銆佷笉鍔?`StatementBoundaryUtil.IsAsiBoundary`锛坙egacy 鍏辩敤锛夈€?
---

## 1. 瀹炵幇缁撴瀯

### 1.1 鏂版枃浠?`typescript/tokens/statements/statement-operator-body.xl.md`

涓や釜绫伙紝涓€灞傝亴璐ｏ細

| 绫?| 鑱岃矗 |
| --- | --- |
| `StatementOperandShape extends ShapeToken` | 琛ㄨ揪寮忔爲閲岀殑**涓€涓妭鐐?*锛歚Kind`锛圚older / Identifier / Number / Operator / Prefix / Paren锛? `Text`锛堝瓧闈㈡枃鏈?/ 杩愮畻绗︼級銆?*涓嶆惉杩?raw 鍗曞厓**锛堣 1.3锛夈€?|
| `StatementOperatorBody` | **澧為噺鐘舵€佹満**锛氬３姣忔敀鍒颁竴涓?basic token 灏卞杺涓€鏍硷紝绔嬪埢寤鸿妭鐐广€佺珛鍒荤敤 `ShapeInsertUtil.InsertBetween` 鎻掑叆銆?|

`StatementOperatorBody` 鐨勫瓧娈靛氨鏄璁?搂4.2 鐨勩€屽３鐘舵€併€嶏細

| 瀛楁 | 鍚箟 |
| --- | --- |
| `Root:Token \| null` | 鏍规寔鏈夎€咃紙`KindHolder`锛夛紝鎳掑缓锛涘彧鏈変竴涓瓙鍗曞厓 = 鏈€澶栧眰琛ㄨ揪寮忚妭鐐广€?|
| `Frames:Array<Token>` | **姝ｅ湪杩涜鐨勪簩鍏冭妭鐐规爤**锛堟爤椤舵渶鍐呭眰锛夛紱鍏冪礌 `Data = [宸` 鎴?`[宸? 鍙砞`銆?|
| `FramePrecs:Array<int>` | 涓?`Frames` 涓€涓€瀵瑰簲鐨勪紭鍏堢骇锛坄OperatorTable.Precedence` 鐨勫師濮嬫暟鍊硷級銆?|
| `FramePending:Array<bool>` | 涓?`Frames` 涓€涓€瀵瑰簲锛氳繕鍦ㄧ瓑鍙虫搷浣滄暟 / 宸插畬鏁淬€?|
| `Prefixes:Array<Token>` | 宸茶鍒般€佹搷浣滄暟杩樻病鍒扮殑鍓嶇紑鑺傜偣锛坄-a` 鐨?`-`锛夈€?|
| `Expect:int` | `ExpectOperand = 1` / `ExpectOperator = 2` 涓ゆ€併€?|
| `Ingested:int` | 宸插杺杩囩殑鍗曞厓鏁帮紙**鍙拷鍔?*锛屼笉閲嶆壂鍓嶇紑锛夈€?|
| `Incomplete:bool` / `Reason:string` | 閬囨湭瀹炵幇鏋勯€狅細鍋滄憚鍏ャ€佽鍘熷洜锛?*涓嶆姏閿?*锛岃 搂4锛夈€?|
| `Inserts:int` | 鏈姸鎬佹満璋冪敤 `InsertBetween` 鐨勬鏁帮紙澧為噺鎻掑叆鍙栬瘉锛夈€?|
| 闈欐€?`TotalBodies / TotalInserts / TotalIncomplete / ShapeTexts / LastText / LastComplete` | 杩涚▼鍐呭彇璇佽鏁颁笌缁撴瀯鏂囨湰锛坄op-proof.mjs` 璇诲畠锛夈€?|

### 1.2 涓や釜鎺ュ叆鐐癸紙鍚?3~5 琛岋紝鏈€灏忎镜鍏ワ級

1. `typescript/tokens/statements/statement-shape.xl.md`
   - 鏂板瓧娈?`OperatorBody:StatementOperatorBody | null = null`锛堝彧鏈夎〃杈惧紡鏃忕殑澹虫墠涓嶆槸 `null`锛夛紱
   - 瑕嗗啓 `ComputePossibleShapes`锛?*鍏?*`OperatorBody.IngestAll(this.Data, this.Template)`锛?*鍐?*`super.ComputePossibleShapes(context)`銆?     椤哄簭鍒绘剰锛氭憚鍏ュ繀椤诲湪鏀跺彛鍒ゅ畾涔嬪墠锛屽惁鍒欍€岃〃杈惧紡宸插畬鏁淬€嶇殑閭ｄ竴鏍煎３浼氬厛琚缓鎺夈€佹柊鍗曞厓鍐嶆病鏈轰細杩涚姸鎬佹満銆?2. `typescript/tokens/statements/root-expression-statement-possible-shape.xl.md`
   - `BuildByIndex` 寤哄３鏃?`shell.OperatorBody = new StatementOperatorBody(shell.Template);`锛堝悓涓€鏉¤鍙ヤ竴涓綋锛夈€?     鍙橀噺澹版槑澹筹紙`StatementRoute.ShellVariable`锛変笉寤轰綋锛岃涓洪€愪綅涓嶅彉銆?
### 1.3 鎻掑叆鐐圭畻娉曪紙S3b 鐨勬牳蹇冿級

閬囦簩鍏冭繍绠楃 `op`锛坄+ - * / %`锛夋椂锛?
```
p = OperatorTable.Precedence(op); rightAssoc = OperatorTable.IsRightAssociative(op)
while 鏍堥潪绌?&& 鏍堥《宸插畬鏁?&& (鏍堥《.p > p || (鏍堥《.p == p && !rightAssoc)):
    寮规爤                      // 宸︾粨鍚堟敹鏁涳細a-b-c 鐨勭浜屾潯 '-' 鍏堟妸 a-b 鏀跺畬
parent = 鏍堥潪绌?? 鏍堥《 : Root
child  = parent.Data[鏈€鍚庝竴涓猐
ShapeInsertUtil.InsertBetween(parent, child, 鏂拌妭鐐?   // 鈫?澧為噺鎻掑叆锛歝hild 鍘熷湴鍙樻垚鏂拌妭鐐圭殑宸︽搷浣滄暟
鍘嬫爤(鏂拌妭鐐? p, pending=true); Expect = 鎿嶄綔鏁?```

閬囨搷浣滄暟锛坄ExpectOperand`锛夛細寤哄彾瀛愶紙鏍囪瘑绗?/ 鏁板瓧 / 鍦嗘嫭鍙凤級锛屾妸鎸傜潃鐨勫墠缂€鑺傜偣鎸夊悗杩涘厛鍑哄寘涓婏紝鍐?`Top().Add(鍙跺瓙)`锛?鏍堥《鑻ュ湪绛夊彸鎿嶄綔鏁板氨鏍囧畬鏁达紝杞?`ExpectOperator`銆?
缁撴瀯锛坄StatementOperatorBody.Render` 娓叉煋鎴愬墠缂€鏂囨湰锛夛細

| 婧愮爜 | 缁撴瀯 | `InsertBetween` 娆℃暟 |
| --- | --- | --- |
| `1*2+3;` | `+(*(1,2),3)` | 2 |
| `a+b*c;` | `+(a,*(b,c))` | 2 |
| `a-b-c;` | `-(-(a,b),c)` | 2 |
| `a*(b+c);` | `*(a,(b+c))` | 1 |
| `a+b*c-d/e;` | `-(+(a,*(b,c)),/(d,e))` | 3 |
| `1/2*3;` | `*(/(1,2),3)` | 2 |
| `a*(b+c)*d;` | `*(*(a,(b+c)),d)` | 2 |
| `-a+b;`锛堝彲閫夛級 | `+(-(a),b)` | 1 |

### 1.4 涓?AST 鐨勫叧绯伙紙**閲嶈锛屼笉鏄粈涔?*锛?
`StatementBuilder` 浠嶇劧浠庡３閲岀殑 **raw 鍗曞厓**寤?AST锛坄BuildFromShell` 涓€琛屾湭鏀癸級锛屾墍浠ワ細

- 鏈寤虹殑鏄?*褰㈢姸灞?*鐨勮〃杈惧紡鏍戯紙S3a/S3b 鐨勫閲忔垚鏋滐級锛?*杩樹笉浜у嚭 AST**锛?- XML 涓?legacy 鐨勯€愬瓧鑺備竴鑷寸敱銆屽悓涓€浠?raw 鍗曞厓 + 鍚屼竴涓缓閫犲櫒銆?*缁撴瀯鎬?*淇濊瘉锛堟瘡娆?`x;` 閮芥垚绔嬶紝涓嶆槸纰板阀锛夛紱
- 鍙跺瓙鍥犳**涓嶆妸 raw token 绉昏繘鑷繁**锛堥偅浼氭敼 `Parent` 鎸囬拡銆佽寤洪€犲櫒璇讳笉鍒板崟鍏冿級銆係3c+ 瑕佹帴绠?AST 鏃讹紝
  蹇呴』鏀逛负銆屽彾瀛愭寔鏈?raw 鍗曞厓 + 澹冲彧鎶婂舰鐘朵氦缁欏缓閫犲櫒銆嶏紝杩欐槸涓嬩竴妫掔殑绗竴浠朵簨锛埪?锛夈€?
---

## 2. 涓撶敤 cases锛坥p 缁勶級

`tests/statement-possible/op-cases.json` 鈫?缁?`operators-live`锛?2 鏉★級锛屼袱涓华鍣ㄨ**鍚屼竴浠?*鐢ㄤ緥锛?
1. **鏃㈡湁 harness**锛堜笉鏀逛竴琛岋級锛?   `node tests/statement-possible/harness.mjs --file=tests/statement-possible/op-cases.json --group=operators-live`
   閫愭潯缁欙細澹宠矾寰?XML == legacy 璺緞锛堝紑鍏?false锛塜ML 閫愬瓧鑺傘€乀S AST 閫愯妭鐐瑰鎷嶃€佷袱娆?Parse 鐨?XML 纭畾鎬с€?   褰㈢姸鏍戦噷涓嶆硠婕?`<StatementShape>` / `<StatementOperandShape>`锛堣璁?I1锛夈€?2. **鏈鏂板鐨勪笓鐢ㄥ彇璇?* `tests/statement-possible/op-proof.mjs`锛?   - 澹宠矾寰勭殑 `StatementRouteUtil.LastFileFallback === false`锛?*涓嶉潬鏂囦欢绾?fallback 閫氳繃**锛夛紱
   - `StatementOperatorBody.ShapeTexts` 涓庢湡鏈?*閫愬瓧**涓€鑷达紙`+(*(1,2),3)` 杩欑被缁撴瀯璇佹槑锛夛紱
   - `TotalInserts >= minInserts`锛?*璇佹槑鏄閲忔彃鍏ワ紝涓嶆槸鏁翠綋 builder 寤烘爲**锛夛紱
   - 鏈鐩栨瀯閫犲繀椤诲垽 `incomplete` 鑰屼笉鏄缓閿欐爲銆?
鐢ㄤ緥娓呭崟锛坄source` / 鏈熸湜缁撴瀯锛夛細

| case | source | 鏈熸湜 |
| --- | --- | --- |
| op-mul-add | `1*2+3;` | `+(*(1,2),3)`锛宨nserts 鈮?2 |
| op-add-mul | `a+b*c;` | `+(a,*(b,c))`锛宨nserts 鈮?2 |
| op-sub-left | `a-b-c;` | `-(-(a,b),c)`锛宨nserts 鈮?2 |
| op-paren | `a*(b+c);` | `*(a,(b+c))`锛宨nserts 鈮?1 |
| op-mixed | `a+b*c-d/e;` | `-(+(a,*(b,c)),/(d,e))`锛宨nserts 鈮?3 |
| op-ident-only | `a+b;` | `+(a,b)`锛宨nserts 鈮?1 |
| op-div-mul | `1/2*3;` | `*(/(1,2),3)`锛宨nserts 鈮?2 |
| op-paren-chain | `a*(b+c)*d;` | `*(*(a,(b+c)),d)`锛宨nserts 鈮?2 |
| op-prefix | `-a+b;` | `+(-(a),b)`锛宨nserts 鈮?1 |
| op-multi-statement | `1*2+3;` 鈴?`a+b*c;` 鈴?`let z = a+b*c;` | 涓や釜浣擄細`["+(*(1,2),3)","+(a,*(b,c))"]`锛宐odies = 2 |
| op-asi | `a+b` 鈴?`c*d;` | `["+(a,b)","*(c,d)"]`锛宨nserts 鈮?2 |
| op-unsupported-call | `f(1, 2);` | texts = `[]`锛宨ncomplete = true锛堟湭瑕嗙洊鏋勯€犱笉寤洪敊鏍戯級 |

---

## 3. 澹崇姸鎬佷笌 EndPossible 鐨勪簰鏂?
鏈鐨勮〃杈惧紡浣?*涓嶆敞鍐岃繘 `CatalogGuide`**锛氬畠鏄３涓婄殑涓€涓瓧娈电骇鍗忎綔鑰咃紙鍦?`ComputePossibleShapes` 閲屽厛鎽勫叆銆?鍐嶆妸鍚屼竴鏍间氦缁欏３鑷繁鐨勭洰褰曪級锛屾墍浠?*涓嶅瓨鍦?*銆屾櫘閫氫綋鍊欓€変笌 `EndPossible` 鍚屾牸 `Accept`銆嶈繖涓€绫诲啿绐?锛坄CatalogGuide` 鐨勩€岀粓缁撳€欓€変笌鍏跺畠鍊欓€夊悓鏃舵垚绔嬨€嶅湪缁撴瀯涓婃棤娉曡瑙﹀彂锛夈€?
`--double-accept` 浠嶆寜鍘熸牱璺戝叏琛紝璇绘暟瑙?搂5銆傝璁?搂4.2 瑕佹眰鐨勩€屾寜 `StatementClass` 閫愭牸鍒嗘淳鐨勫€欓€夈€嶇暀鍒?S3c锛?閭ｆ椂浣撹浠庡瓧娈佃縼鍒?`CatalogGuide.Candidates`锛屼笌鏈鐨勭姸鎬佹満涓€涓€瀵瑰簲锛坄Expect` 鈫?璇ユ牸鎺ュ彈鍝釜鍊欓€夛級銆?
鏀跺彛鍒ゆ嵁**鏈敼**锛歚StatementEndPossibleShape` 瀵硅〃杈惧紡鏃忎粛鍙敤 `StatementBoundaryUtil.CanEndStatement`
锛坄;` / ASI / EOF 涓夋潯鍚屾簮锛夛紝鏈鍦ㄥ畠涔嬪墠鍙€屾憚鍏ャ€嶏紝涓嶅弬涓?Accept/Reject銆?
---

## 4. 涓嶆敮鎸佹瀯閫狅紙鏈鐩栨竻鍗曪級涓?fallback 鍙ｅ緞

**浠讳綍鏈疄鐜扮殑鍗曞厓閮戒笉寤烘爲**锛歚StatementOperatorBody.Fail` 缃?`Incomplete`銆佽 `Reason`銆佸仠姝㈡憚鍏ワ紱
**涓嶆姏閿?*锛圓ST/XML 鐢辨棦鏈夊缓閫犲櫒鍘熸牱浜у嚭锛屾墍浠ュ３璺緞涓?legacy 閫愬瓧鑺傜浉鍚岋紝涔熶笉浼氭帀杩涙枃浠剁骇 fallback锛夈€?鐞嗙敱锛氳繖鏉¤矾**涓嶄骇鍑?AST**锛屾嫆缁濆缓鏍戝氨宸茬粡鏄€屼笉闈欓粯寤洪敊鏍戙€嶏紱鎶涢敊鍙嶈€屼細鎶婃暣鏉℃枃浠舵帹缁?legacy 閲嶈В鏋愶紝
鎶娿€屽舰鐘跺眰娌℃帴銆嶄吉瑁呮垚銆屽３鍧忎簡銆嶃€傛枃浠剁骇 fallback 浠嶅彧鏈嶅姟澹冲缓涓嶅嚭鏉ワ紙`TryToClose` / `DetachShell`锛屾湰妫掓湭鏀癸級銆?
鏈鐩栨竻鍗曪紙S3c+ / 涓嬩竴妫掞級锛?
1. 瀛楃涓层€佹ā鏉垮瓧闈㈤噺銆佹鍒欏瓧闈㈤噺鍙跺瓙锛坄Incomplete`锛屽師鍥犮€屽崟鍏冦€嶏級锛?2. 鏁扮粍瀛楅潰閲?`[`銆佸璞″瓧闈㈤噺 `{`锛?3. 鎴愬憳璁块棶 `.` / `?.`銆佸厓绱犺闂?`[...]`銆佽皟鐢紙瀹炲弬鍒楄〃 `(...)`锛夆€斺€擿f(1,2);` 鏄唬琛ㄧ敤渚嬶紱
4. 璧嬪€?`=` 涓庡叏閮ㄥ鍚堣祴鍊笺€佹潯浠惰〃杈惧紡 `?:`銆侀€楀彿銆佺澶村嚱鏁帮紱
5. `**`锛堝彸缁撳悎閫昏緫宸插疄鐜帮紝S3b 鍙紑 `+ - * / %`锛沗**` 璧?`Incomplete`锛夛紱
6. 鍏跺畠浼樺厛绾?鈮?0 鐨勮繍绠楃锛歚&& || ?? << >> >>> & | ^`銆佹瘮杈冩棌 `< > <= >= == != === !==`銆?   鍏抽敭瀛楄繍绠楃 `instanceof` / `in`锛?7. 鑷鑷噺 `++` / `--`锛堝墠缂€涓庡悗缂€锛夛紱
8. 鍏抽敭瀛?瀛楅潰閲忚捣鐐癸細`true false null undefined this super new typeof void delete await yield as satisfies`锛?9. 鏁板瓧鍐欐硶鍙寜銆岄瀛楃鏄暟瀛椼€嶅垽 `KindNumber`锛歚.5` 杩欑被浠?`.` 寮€澶寸殑涓嶈锛沗0x`/`0b`/`0o`/`1_000`/`1n`
   鑳藉缓鍙跺瓙浣嗘枃鏈師鏍枫€佷笉鍋氭暟鍊煎垽瀹氾紱
10. 琛ㄨ揪寮忎綋鍙鐩?*鏍瑰眰**璇彞锛涘潡鍐咃紙`{ ... }` 鍐咃級浠嶈蛋 legacy 琛ㄨ揪寮忚矾寰勶紱
11. AST 浠嶇敱 `StatementBuilder` 浜у嚭锛堣 1.4锛夛紝褰㈢姸鏍戝皻鏈帴绠?AST锛?12. 鍓嶇紑 + 鎷彿 + 鏇撮珮浼樺厛绾х殑澶氱骇缁勫悎娌℃湁閫愭潯鐢ㄤ緥锛堣鐩栧埌 `-a+b` 涓?`a*(b+c)` 涓ゅ眰锛夈€?
---

## 5. 鍏ㄨ〃璇绘暟


（以下由 	ests/statement-possible/op-proof.mjs 与既有全表仪器实测产出，原文来自 `tmp/run-s3-ops.log`。）

| 仪器 | 退出码 | 关键行 |
| --- | --- | --- |
| tsc | 2 | |
| op-proof | 1 | |
| op-harness | 0 | |
| dev | 0 | |
| all | 0 | |
| double-accept | 0 | |
| lint | 0 | |
| validate | 0 | |
| ast-json | 0 | |
| ast-json-diff | 0 | |
| token-ast | 0 | |
| real-dts | 0 | |
| feas | 0 | |
| insert-between | 0 | |
| perf | 0 | |

```
===== op-proof =====
FAIL  op-mul-add  "1*2+3;"
FAIL  op-add-mul  "a+b*c;"
FAIL  op-sub-left  "a-b-c;"
FAIL  op-paren  "a*(b+c);"
FAIL  op-mixed  "a+b*c-d/e;"
FAIL  op-ident-only  "a+b;"
FAIL  op-div-mul  "1/2*3;"
FAIL  op-paren-chain  "a*(b+c)*d;"
FAIL  op-prefix  "-a+b;"
FAIL  op-multi-statement  "1*2+3;\na+b*c;\nlet z = a+b*c;"
FAIL  op-asi  "a+b\nc*d;"
PASS  op-unsupported-call  texts=[] inserts=0 bodies=1
[op-proof] group=operators-live cases=12 pass=1 fail=11 | 结构文本已核 12 条、InsertBetween 计数已核 11 条
[group] operators-live: pass=12 fail=0 skip=0 uncovered=0
[statement-possible] 互斥仪器: cells=86 candidateCalls=408 endCalls=86 acceptCells=15 waitingNoCandidate=55
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=12 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[statement-possible] 互斥仪器: cells=0 candidateCalls=0 endCalls=0 acceptCells=0 waitingNoCandidate=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=0 skipped=1 | cases pass=0 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
[group] stage1: pass=12 fail=0 skip=0 uncovered=0
[group] asi: pass=12 fail=0 skip=0 uncovered=0
[group] trivia: pass=8 fail=0 skip=0 uncovered=0
[group] route: pass=14 fail=0 skip=0 uncovered=0
KNOWN satisfies/satisfies-decl-instantiation-no-semicolon  "let a: Foo<Bar>\nlet b = 1;"
[group] satisfies: pass=8 fail=0 skip=0 uncovered=0
[group] operators: pass=18 fail=0 skip=0 uncovered=0
[statement-possible] 互斥仪器: cells=422 candidateCalls=2627 endCalls=422 acceptCells=82 waitingNoCandidate=154
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=6 skipped=3 | cases pass=72 fail=0 skip=0 known=1 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
===== double-accept =====
[statement-possible] 互斥仪器: cells=520 candidateCalls=3212 endCalls=520 acceptCells=100 waitingNoCandidate=175
[statement-possible] double-accept 冲突: 0
[statement-possible] double-accept: cases=91 failed=0
  KNOWN     typescript/tokens/expressions/expression-builder.js:311 const precedence = 11 —— `as` 的固定优先级 11；设计 §4.3 要求 Stage 3 迁入 OperatorTable.AsPrecedence
===== validate =====
===== ast-json =====
===== ast-json-diff =====
===== token-ast =====
OK         tests/cases/token/expressions/expr-r1210-opt-double-assert.ts
OK         tests/cases/token/lexical/lex-string-double-apostrophe.ts
OK         tests/cases/token/lexical/lex-string-double-codepoint-escape.ts
OK         tests/cases/token/lexical/lex-string-double-escapes.ts
OK         tests/cases/token/lexical/lex-string-double-hex-escape.ts
OK         tests/cases/token/lexical/lex-string-double-unicode-escape.ts
OK         tests/cases/token/lexical/lex-string-single-double-quote.ts
OK         tests/cases/token/statements/stmt-label-double.ts
OK         tests/cases/token/types/type-lit-string-double.ts
OK         tests/cases/token/types/type-op-as-unknown-as.ts
OK         tests/cases/token/types/type-prim-unknown.ts
known-gap:     0 file(s) (none)
non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
===== real-dts =====
real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0
===== perf =====
[perf] build=C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s3-ops\build\ts
[perf] reps=5 long=300 many=2000（中位数；不设硬阈值）
[perf] long n=300 median=14.75ms tokens=599 candidateCalls=30 callsPerToken=0.05
[perf] many statements=2000 median=29.90ms tokens=2000 candidateCalls=30015 callsPerToken=15.01
[perf] scale n=100 median=1.51ms tokens=199 candidateCalls=30
[perf] scale n=200 median=3.85ms tokens=399 candidateCalls=30
[perf] scale n=400 median=12.65ms tokens=799 candidateCalls=30
[perf] scale ratio(200/100)=2.55 ratio(400/200)=3.29（线性≈2.0；>2.5 视为退化告警，不判失败）
[perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3）
[perf] done
```

---

## 6. 鍓╀綑闂 / 缁欎笅涓€妫?
1. **S3c 绗竴浠朵簨**锛氭妸 `StatementOperandShape` 鐨勫彾瀛愭崲鎴愮湡姝ｇ殑瀛楅潰閲?鏍囪瘑绗﹀舰鐘讹紙`NumericLiteralShape.FromBasicToken`
   杩欎竴鏃忥級锛屽彾瀛愭寔鏈?raw 鍗曞厓銆佸３鎶婂舰鐘讹紙鑰屼笉鏄?raw 鍗曞厓锛変氦缁欏缓閫犲櫒鈥斺€旈偅鏃?XML 涓€鑷存€ф墠浠庛€岀粨鏋勬€с€嶅彉鎴愩€岀湡鎺ョ銆嶃€?   娉ㄦ剰 `FromBasicToken` 浼氭妸鍗曞厓绉昏繘褰㈢姸锛堟敼 `Parent`锛夛紝蹇呴』鍏堣 `StatementBuilder` 鎺ュ彈褰㈢姸杈撳叆锛?   鍚﹀垯 `BuildFromShell` 鐨?`builder.At === builder.Units.length` 鏂█浼氱偢銆?2. 浣撹縼鍒?`CatalogGuide.Candidates`锛埪?.2 鐨勩€屾寜 `StatementClass` 鎺ュ彈銆嶏級锛屼笌鏈鐨?`Expect` 涓€涓€瀵瑰簲锛?   灞婃椂 `--double-accept` 鎵嶆湁鎰忎箟锛堢幇鍦ㄤ綋涓嶅湪鍊欓€夐泦閲岋級銆?3. 鏈鐩栨竻鍗曪紙搂4锛夋寜銆屼竴绫讳竴涓?commit銆嶆帹杩涳紝姣忕被鍏堣ˉ op-cases 鍐嶆敼鐘舵€佹満銆?4. 缁勫唴涓ゆ潯 ASI 鐢ㄤ緥锛坄op-asi`锛変緷璧栧３鐨勮竟鐣屾惉杩愶紙`FinishShell`锛夛紝鑻ュ悗缁敼鍔ㄨ竟鐣屽垽瀹氾紝鍏堣窇瀹冦€?
