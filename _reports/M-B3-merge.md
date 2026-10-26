# M-B3 鍚堝苟鎶ュ憡锛歚feature/b3-control-heads`锛?*宸插洖婊?*锛?
**缁撹锛氬悎骞惰鍥炴粴銆?* `b3-control-heads` 鍚堝叆鍚庯紝榛樿妗ｉ獙鏀跺叏缁匡紝浣?**legacy 瀵圭収妗ｅけ璐?*
锛坄gates --legacy` exit 1銆乣wide-ast --legacy` FileFallbackCount 11 > 澶╄姳鏉?2銆佹湁宸紓 1 > 0锛夛紝
涓庝换鍔′功棰勬湡锛坙egacy 4/0/7 涓?0/0/2锛変笉绗︼紝鎸夌‖瑙勫垯 `git reset --hard $BASE` 鍥炴粴銆?涓讳粨搴撳凡鍥炲埌 `576f8005`锛宍b3-control-heads` **鏈悎鍏?*銆傛湭 push銆佹湭 pull origin銆佹湭鏂板缓鍒嗘敮銆?
## 1. 鍚堝苟

| 椤圭洰 | 鍊?|
| --- | --- |
| 涓讳粨搴?| `xl-example`锛宍feature/all-possible` |
| `$BASE` | `576f8005b0fc922d27f08e3a40e024919fb47640`锛?*涓嶆槸** 浠诲姟涔︾殑 `c2bb8b77`锛沗c2bb8b77` 涔嬩笂宸叉湁 D7 鍚堝苟 `576f8005`锛?|
| 寰呭悎骞?| `xl-example-set/b3-control-heads` @ `18c5cf7b`锛坄feature/b3-control-heads`锛宐ase `c2bb8b77`锛?|
| fetch | `git fetch --no-tags <path> "feature/b3-control-heads:refs/merge/b3"` 鈫?`18c5cf7b` |
| 鍚堝苟鏂瑰紡 | `git merge --no-ff refs/merge/b3 -m "merge(b3): control-flow head catalogs"` 鈫?**`706af868`** |
| 鍐茬獊 | **0**锛坥rt锛?|

寮€宸ユ椂宸ヤ綔鏍戝苟涓嶅共鍑€锛氭湁涓€涓?**0 瀛楄妭鏈窡韪枃浠?*
`typescript/tokens/statements/control-head-possible-shape.xl.md`锛堟畫鐣欏崰浣嶏級锛?姣斿 merge-ref 鐗堟湰鍐呭涓嶅悓锛圫HA-256 涓?0 瀛楄妭锛夛紝鍒犻櫎鍚庡悎骞舵甯革紝鏈奖鍝嶇粨鏋溿€?
涓夌偣 diff锛坄c2bb8b77...refs/merge/b3`锛?0 鏂囦欢锛歚_reports/B3.md`(A)銆?`core/syntax/basic-tokens/bracket.xl.md`銆乣core/syntax/catalog-guide.xl.md`銆?`typescript/tokens/expressions/expression-builder.xl.md`銆?`typescript/tokens/files/source-file-shape.xl.md`銆?`typescript/tokens/statements/bracket-catalog-installer.xl.md`銆?`typescript/tokens/statements/bracket-role-resolver.xl.md`銆?`typescript/tokens/statements/control-head-possible-shape.xl.md`(A)銆?`typescript/tokens/statements/statement-route-util.xl.md`銆?`_reports/M-D7-merge.md`(涓?BASE 鍐呭鐩稿悓锛屽悎骞跺悗鏃犲彉鍖?銆?
## 2. 閲嶅缓锛堝悎骞跺悗锛?
| 鍛戒护 | 缁撴灉 |
| --- | --- |
| `xl_build`锛坈wd=repo锛宍core` + `typescript` 鈫?`ts`锛?| **8 written / 621 skipped / 0 error / 3 warning**锛堟棦鏈?E1107 閲嶅澹版槑锛屼笌鏈鏃犲叧锛?|
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

## 3. 楠屾敹锛堝悎骞跺悗锛屽疄娴?vs 棰勬湡锛?
| 妫€鏌?| 棰勬湡 | 瀹炴祴 | 鍒ゅ畾 |
| --- | --- | --- | --- |
| `node tests/gates/run.mjs` | 4/0/7锛宔xit 0 | **4/0/7**锛?.4s锛宔xit 0 | 鉁?|
| `node tests/gates/run.mjs --legacy` | 4/0/7锛宔xit 0 | **3/1/7**锛宔xit 1锛堝敮涓€澶辫触闂?`wide-ast`锛氭湁宸紓 1 > 0銆丗ileFallbackCount 11 > 2锛?| 鉂?|
| `node tests/parse/wide-ast.mjs` | PASS 5/32/94 | **PASS**锛氬穿婧?5/5锛堝叏鍦ㄩ鏈熸竻鍗曪級銆佸樊寮?**33**/87銆乫allback **86+16=102**/94銆佺己 range 0銆佽秺鐣?0銆乣policyProblems` 0 | 鈿狅笍 閫氳繃浣嗚鏁板亸绂?32/94 |
| `node tests/parse/wide-ast.mjs --legacy` | PASS 0/0/2 | **FAIL**锛氭湁宸紓 **1**/0銆乫allback **11**(`tests/cases/token`=10 + `samples/declarations.ts`=1)/2 | 鉂?|
| `node typescript/cases/real-dts-ast.mjs` | PASS | **PASS**锛?26 浠躲€佹垚鍔?221銆佸穿婧?5/5銆佸樊寮?**0/87** | 鉁?|
| `node typescript/cases/tts/run.mjs --quiet` | PASS 429 | **exit 0**锛坄--quiet` 鏃犳憳瑕佽緭鍑猴級 | 鉁?|
| `tshape-judge ts-all` | 429/426/3 | **429 / 426 ok / 3 failures**锛宔xit 1锛堟棦鏈夐鏈?throw锛岃 M-D7 鎶ュ憡鍙ｅ緞锛?| 鉁?|
| `steps for-classic --from 5 --to 10` | i@6銆?@10 | step 6 鈫?**`IdentifierShape` "i"**锛泂tep 10 鈫?**`NumericLiteralShape` "0"** | 鉁?|
| `steps switch-fallthrough --from 8 --to 9` | a@9 | step 8 `Common "a"`銆乻tep 9 鈫?**`IdentifierShape "a"`** | 鉁?|

鍒ゅ畾锛?*涓ら」 legacy 妫€鏌ュけ璐?鈫?瑙﹀彂鍥炴粴**銆?
### 3.1 归属：确认为 **B3 引入**（用回滚后的正确重建验证）

回滚到 `576f8005` 后，用 **`xl_build` 工具 + `tsc`** 正确重建，再跑同一批门：

| 检查（BASE） | 实测 |
| --- | --- |
| `node tests/gates/run.mjs` | **4/0/7**，exit 0 |
| `node tests/gates/run.mjs --legacy` | **4/0/7**，exit 0（wide-ast legacy 0/0/2 PASS） |

BASE 两档皆绿，合并后 legacy 变红（fallback 11/2、差异 1/0）⇒ **退化由 B3 引入**。
最可能来自 `Bracket.Close` / `FlushOnClose` / `ParsePrimary IsAtom` 在 legacy 档的连带影响：
新增 head 原子让 legacy 结构性差异 +1，并让 10 个 `tests/cases/token` 文件要到
`EnableFileFallback` 才通过。

⚠️ 本机 `npm run build`（`xl build && tsc`）不可用（`xl` 不在 PATH，会静默短路掉 `tsc`），
必须用 `xl_build` 工具重建；否则会拿旧产物得出错误结论（本次一度踩到，已作废该次读数）。
## 4. 鍥炴粴涓庢竻鐞?
| 鍔ㄤ綔 | 缁撴灉 |
| --- | --- |
| 鍥炴粴 | `git reset --hard 576f8005`锛坄$BASE`锛夛紝`706af868` 宸茶劚绂诲垎鏀?|
| 瑙?junction | `b3-control-heads\node_modules` 鏄?ReparsePoint锛宍rmdir` 鍏堣В閾撅紙鐩爣瀹屽ソ锛?|
| 鍒犻櫎鐩綍 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b3-control-heads` 宸蹭笉瀛樺湪 |
| 鍒犻櫎 ref | `git update-ref -d refs/merge/b3`锛坄git show-ref` 宸叉棤 `refs/merge` 琛岋級 |
| INDEX / README | **鏈噸鐢熸垚**锛圔5 璐熻矗锛孊3 涓嶆敼璐︽湰锛?|
| push / pull origin | **鏈墽琛?* |

## 5. 鍥炴粴鍚庣殑鏀跺熬鐘舵€?
- `HEAD = 576f8005`锛屾簮鐮?= BASE锛沗dist/ts` 宸茬敱 `xl_build` 鎸?BASE 閲嶇敓鎴愩€?- 楠屾敹璇绘暟鐨勫壇浣滅敤锛坄tts` 浼氭敼鍐?`typescript/cases/tts/INDEX.md` 绛夛級宸插湪鍚堝苟鎬佹牳瀵逛负骞插噣锛?  鍥炴粴鍚庡伐浣滄爲浠呮柊澧炴湰鎶ュ憡銆?