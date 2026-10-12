// xl:note `?.` 写在**实参位**：`f(o?.a)` 的那个 `NullConditionalOperator` 属于**实参**，
//       不属于被调用者（第 143 轮修的）。
//       产物原来一看「`Method` 里有 `?.`」就折链，于是把**整个调用折没了**——
//       `console.log(o?.a)` 什么都不打印、退出码还是 0（**静默少一整句**）。
//       判据是「**第一个子单元就是方法名自己**」：被调用者自带 `?.` 时它就在子单元里
//       （`x?.y?.(1)` 的 `Identifier(x)`），而实参位第一个子单元是实参。
// xl:expect Method:3
// xl:expect NullConditionalOperator:4
// xl:absent PropertyAccess
f(o?.a);
g(o?.a, 1);
h?.(o?.a);
