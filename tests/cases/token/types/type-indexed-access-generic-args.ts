// xl:expect IndexedAccessType:4,GenericType:5,TypeAssign:2,TypeDefine:2
// xl:expect Interface:1,MethodDeclaration:1,ReturnType:1
// xl:note 下标访问的方括号里带两个以上实参的泛型（`K[A<B, C>]`）：
// xl:note 括号还没成形时 `<` 的宿主就是那个 `[`，位置答案在括号自己那一层
type X = K[A<B, C>];
type Y = Array<A<B, C>>[K];
let v: K[A<B, C>];
interface I {
  m(): K[A<B, C>];
}
