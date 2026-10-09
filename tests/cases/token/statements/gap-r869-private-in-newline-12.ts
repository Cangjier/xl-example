// xl:note 第 869 轮普查量出的缺口（private-in-newline-12）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `#x` 换行 `in o`：私有名与 `in` 之间的换行 ⇒ `#x in o`（二元运算的一支）在换行处收壳
class A { #x = 1; static f(o: A) { return #x 
 in o; } }
