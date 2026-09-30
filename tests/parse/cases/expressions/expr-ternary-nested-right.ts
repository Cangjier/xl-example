// xl:note 嵌套三元（右结合，两层）：`a ? b : c ? d : e` 必须嵌套成 TernaryOperator 里再套一层
//（修前外层先把假值段切成 `c ? d : e` 四个平铺单元，内层再也成不了形；
//  修法两处，都在三元规则自己身上：Previous 加「假值段里还有 `?` 就先不成」、
//  Process 的真值段不能越过下一个 `?`）
// xl:note 三层以上的右结合嵌套（`a ? b : c ? d : e ? f : g`）只能成形内两层：
// 外层那个 `:` 会被内层的替换消化掉，而「每条规则重复扫」这种公共改法会让整个套件 OOM
//（实测 `run.mjs` FATAL ERROR: heap out of memory），试过、退回了。见 core/syntax/token.xl.md 的 Reorganize。
// xl:expect TernaryOperator:2,TernaryOperatorCondition:2,TernaryOperatorFalseStatement:2
const x = a ? b : c ? d : e;
