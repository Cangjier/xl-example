// xl:note 函数重载：两个签名（无函数体）+ 一个实现
// xl:expect Function,FunctionBody
function f(x: string): string
function f(x: number): number
function f(x: any): any {
  return x
}
