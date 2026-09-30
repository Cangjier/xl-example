// xl:expect Function,FunctionBody,ReturnType
// xl:note 基线用例（来自缺口审计语料）
function f(a: number, b: string = "x"): void {
  g(a, b)
}
