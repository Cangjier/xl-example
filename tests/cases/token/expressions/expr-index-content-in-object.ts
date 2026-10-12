// xl:note 对象字面量里的下标访问：方括号自己那一格按**外层花括号的 Context** 判值位（第 76 轮），内容照常跑重组，`[i + 1]` 里的 `+` 必须折成二元运算——原来会先撞上属性分隔冒号 `start:` 而被判成类型位，同一个 `kids[i + 1]` 在语句位置与对象字面量里长出两种树。
// xl:expect ObjectLiteral,BinaryOperator,TernaryOperator
// xl:absent LiteralType,TypeDefine
const o = { start: range ? range[0] : 0, end: kids[i + 1] };
