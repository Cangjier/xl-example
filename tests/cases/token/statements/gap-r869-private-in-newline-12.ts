// xl:note 第 869 轮普查量出的缺口（private-in-newline-12）：这一条钉的是上面那条根因的一个落点
// 第 879 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `#x` 换行 `in o`：私有名与 `in` 之间的换行 ⇒ `#x in o`（二元运算的一支）在换行处收壳
// （具体根因：**解析期**那一半的 `NextLineContinuesExpression` 词表里没有 `in` / `instanceof`
//   —— 两个都是保留字、起不了一条语句，可换行处被判成边界，`in o;` 于是另起一条 `ExpressionStatement`）
class A { #x = 1; static f(o: A) { return #x 
 in o; } }
