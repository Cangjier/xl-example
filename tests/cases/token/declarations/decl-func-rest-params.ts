// xl:note 剩余参数 ...rest: number[]
// xl:expect Function,FunctionBody
function sum(first: number, ...rest: number[]) {
  return first + rest.length
}
