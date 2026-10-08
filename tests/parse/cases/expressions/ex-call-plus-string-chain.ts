// xl:note 调用结果接字符串：加法，不是模板标签
// xl:expect BinaryOperator
// xl:expect SymbolToken
// xl:expect Method
// xl:absent InterpolationString
function f(): number {
  return 1;
}
const a = f() + "x" + "y";
const b = f() + 1 + "z";
const tag = (parts: TemplateStringsArray): string => parts[0];
const c = tag`t`;
console.log(a, b, c);
