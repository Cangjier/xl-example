// xl:note 第 869 轮普查量出的缺口（exp-named-newline-then-from-like）：这一条钉的是上面那条根因的一个落点
// xl:known-gap 同一格的纠错形态：`from("m")` 不是字符串字面量，TS 仍把括号表达式当模块路径收进同一条声明
export { a }
from("m");
