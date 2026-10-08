// xl:title 对象字面量的值是一对圆括号里的二元表达式（第 690 轮收掉台账）
// xl:judge stdout
// xl:why 第 686 轮那两条「值位数组被折成类型 / 对象值位的括号」就是这一族；
//       本条现在与 node 逐字相同，台账（原来记 `blocked`）在第 690 轮撤掉。
// xl:end

const a = { x: 1, y: 3 };
const b = { x: 2, y: 4 };
const mid = { x: (a.x + b.x) / 2 };
console.log(mid.x);
