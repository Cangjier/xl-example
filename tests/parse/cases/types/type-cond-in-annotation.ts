// xl:expect Let,TypeDefine,Keyword
// xl:absent TernaryOperator
// xl:note 类型标注里的条件类型不能被当成表达式三元：`TypeDefine` 装的是**类型队列**
// （只有 KeywordReorganization 一条），通用队列里的 TernaryOperatorReorganization 会把
// `T extends U ? A : B` 收成 TernaryOperator，那就错了
let x: T extends U ? A : B
