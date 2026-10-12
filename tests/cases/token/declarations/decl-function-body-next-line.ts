// xl:note 函数体写在下一行（含生成器、async 与返回类型）：头与体仍是同一条声明
// xl:expect Function,FunctionBody,ReturnType
function f<T>(x: T): T
{ return x }
function* g()
{ yield 1 }
async function h()
{ await 1 }
const k = function (a: number): number
{ return a }
