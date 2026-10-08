// xl:note 三元表达式后面还跟着别的语句：`? :` 不许跨语句配对（第 66 轮）
// xl:expect TernaryOperator:2,ArrayType,TypeDefine:1
const a = x ? "t" : "f";
const b = y ? "t" : "f";
const c: number[] = [];
