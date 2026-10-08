// xl:expect IfSet,IfStatement
// xl:note 块体 + 空语句体：`if (a) {} else ;` 的 else 是 EmptyStatement，不是空的 Block
//（投影原来在「不是块就是 `{}`」那条路上把 `else ;` 画成一个空 `Block`）
if (a) {} else ;
