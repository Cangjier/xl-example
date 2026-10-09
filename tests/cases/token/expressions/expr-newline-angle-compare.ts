// xl:note 换行后以 `<` 开头时 ASI 不断句（第 905 轮随 `new` 那一格一起收掉后补的守卫）：`const a = b` 换行 `<C>d;` 在 TS 那边是**一条**声明里的比较链 `((b < C) > d)`，不是「一条声明 + 一条类型断言语句」
// xl:round 905
// xl:expect BinaryOperator:2,SymbolToken:3,Identifier:3
// xl:end
const a = b
<C>d;
