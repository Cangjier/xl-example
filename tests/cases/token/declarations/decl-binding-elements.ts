// xl:note 解构绑定的元素：对象 / 数组 / 形参 / catch 四处都收成 BindingElement（第 66 轮第八批）
// xl:expect BindingElement:9,Let:2,ObjectLiteral:3,ArrayLiteral,Parameter,Function,Try
const { a, b: c, d = 1 } = obj;
const [x, , y, ...rest] = arr;
function f({ p, q }: T) {}
try {} catch ({ message }) {}
