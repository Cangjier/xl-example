// xl:note `&&` / `||` 混用：`&&` 那一趟先收，`||` 那一趟再把它摊平接上（子单元顺序 = 原文顺序）
// xl:expect LogicalOperator:1,SymbolToken
if (a || b && c) {
  d()
}
