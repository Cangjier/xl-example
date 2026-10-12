// xl:title `replace` 的函数形式拿到的实参表
// xl:round 691
// xl:judge stdout
// xl:want blocked
// xl:why `replace` 的**函数形式**这一条用的是**正则字面量**（`/\d/g`），而 `RegExp` 字面量
//       还没实现（`unimplemented: expression RegularExpressionLiteral`）⇒
//       整份文件跑不起来。要做（与 `RegExp` 那一族同一件）。
// xl:end
console.log("a-b".replace("-", (...rest: any[]) => JSON.stringify(rest)));
console.log("a1b".replace(/\d/g, (m: any, ...rest: any[]) => "[" + m + rest.length + "]"));
console.log("x".replace("x", "$&$&"));
