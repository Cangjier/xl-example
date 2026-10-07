// xl:expect BindingElement,ObjectLiteral,Parameter
// xl:note 嵌套绑定模式带默认值：`b: { c } = { c: 0 }` 里 `=` 后面那个花括号是**初始化式**
// （值位，里面的 `c: 0` 是 `PropertyAssignment`），不是又一层绑定模式
function f({ a, b: { c } = { c: 0 } }: any): string {
    return [a, c].join(",");
}
console.log(f({ a: 1 }), f({ a: 2, b: { c: 3 } }));
