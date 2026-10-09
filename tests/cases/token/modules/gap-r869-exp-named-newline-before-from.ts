// xl:note 第 869 轮普查量出的缺口（exp-named-newline-before-from）：这一条钉的是上面那条根因的一个落点
// xl:known-gap 花括号子句已经完整、`from` 还在下一行：解析期那一条只看得到左边那一半（`from` 还没读进来），而 TS 在子句后面见到 `from` 就把它当同一条声明的模块路径
export { a }
from "m";
