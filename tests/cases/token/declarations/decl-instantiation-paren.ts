// xl:note 实例化表达式：被实例化的那一格是值位括号（TS 那边是 ParenthesizedExpression）
// xl:expect Bracket:1,PropertyAccess:1,GenericType:1
const f = (a.b)<string>;
