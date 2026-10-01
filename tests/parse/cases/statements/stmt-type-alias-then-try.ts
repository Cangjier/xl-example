// xl:note `type X = T` 换行紧跟 `try`（**没有分号**）：`{` 的回扫必须停在语句边界，
// 否则 `try` 的语句体会被收成一个 `TypeLiteral`，`TryReorganization` 当场抛
// 「next is not Bracket」整份文件解析失败（三片段组合探针抓到的形状）。
// xl:expect Try:2,TryBody:2,CatchBody:2
type H = number
try { } catch { }
type G = readonly X
try { } catch (e) { } finally { }
