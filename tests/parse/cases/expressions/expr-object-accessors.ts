// xl:note 对象字面量取值器与设值器 { get x() {} , set x(v) {} }
// xl:expect ObjectLiteral,Method
const o = { get x() { return 1 }, set x(v) {} };
