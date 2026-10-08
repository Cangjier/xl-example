// xl:note 链尾的下标访问：`this.Temp[…]` 里那个 `[` 是**元素访问**，必须保持成 `Bracket`。
// 判据是「前一个单元是操作数末尾」，而链折成 `PropertyAccess` 之后前一个单元换了一种类型——
// 漏了这一条时 `[` 会被收成 `ArrayLiteral`（下标访问变成数组字面量，实测 35 处）。
// 括号里的 `this.Temp.length - 1` 自己也成了一条链加一个二元节点。
// xl:expect PropertyAccess:2,BinaryOperator:1,Bracket:1
// xl:absent ArrayLiteral
const n = this.Temp[this.Temp.length - 1];
