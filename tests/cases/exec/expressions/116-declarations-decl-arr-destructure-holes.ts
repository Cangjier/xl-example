// xl:title AST 语料 declarations/decl-arr-destructure-holes.ts：decl arr destructure holes
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 数组解构：跳位（洞）与中间省略
//  xl:expect BindingElement,ArrayLiteral,PropertyAccess
const [, second, , fourth] = [1, 2, 3, 4]
console.log(second, fourth)
