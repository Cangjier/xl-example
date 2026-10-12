// xl:note 值位的位运算 `|` / `&` / `^` 要成 BinaryOperator，而类型位的联合/交叉不能碰
//（这两个符号两种位置都有含义；类型位那份在轮到该规则时已经被 TypeAssign / TypeDefine
//  收进节点里，所以判据落在「父单元是不是语句」上就够——不是看符号文本）
// xl:expect BinaryOperator:3,TypeAssign,TypeDefine
const x = a | b;
const y = a & c;
const z = a ^ d;
type T = A | B;
let v: A & B;
