// xl:note 可选参数 a?、b?: number，以及它们后面的必选参数 c
// xl:expect Function,FunctionBody
// xl:absent TernaryOperator
function fmt(a?: string, b: number = 2, c = 3) {
  return String(a) + b + c
}
