// xl:note EOF 边界：混合比较链落在最后一条语句、且文件末行没有换行符时，关系层照样先折
// xl:round 925
// 第 925 轮收掉（第 923 轮普查登记的余量一，第 924 轮把触发条件量窄）：`x == y < z`
// 的关系层 `<` 该**先**折（TS 给 `x == (y < z)`），而末尾那一行**还没被包进 `Statement`**
// ⇒ `IsValuePositionOperator` 看到的父单元是 `Root`（块里最后一条则是 `IfBody` /
// `MethodBody` / `LamdaBody` …）⇒ 判否 ⇒ 关系层让开、`==` 先折 ⇒ 整条链成了 `<` 套 `==`
// （缺 `y < z`、多 `x == y`）。补一个结尾换行、补 `;`、或后面再跟一条语句，三种写法本来都绿。
// xl:expect BinaryOperator:2,Let:1,Identifier:3,SymbolToken:3
// xl:end
const b = x == y < z