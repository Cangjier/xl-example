// xl:note 嵌套三元（右结合）：`a ? b : c ? d : e` 必须嵌套成 TernaryOperator 里再套 TernaryOperator
//（修前外层先把假值段切成 `c ? d : e` 四个平铺单元，内层再也成不了形；
//  修法两处：Previous 加「假值段里还有 `?` 就先不成」，
//  Process 的真值段不能越过下一个 `?`，再加 Reorganize 的重复扫）
// xl:expect TernaryOperator:3,TernaryOperatorCondition:3,TernaryOperatorFalseStatement:3
const x = a ? b : c ? d : e ? f : g;
