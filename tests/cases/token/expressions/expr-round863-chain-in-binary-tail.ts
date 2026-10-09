// xl:note 第 863 轮：链的续格与后面的运算符 / 逗号折进了同一个单元时，链头是**上一个单元的最后一个孩子**
// xl:expect BinaryOperator,PropertyAccess
const o: any = { f: () => ({ v: 1 }) };
let x: any;
let y: any;
x = 1 + o["f"]().v + 2;
x = 1 + o["f"]().v * 2 + 3;
x = 1 + o["f"]().v + 2 + 3;
x = 1 + o["f"]().v, y;
x = 1 + o["f"]().v + 2, y;
x = 2 + (1 + o["f"]().v + 2);
