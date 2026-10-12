// xl:title AST 语料 declarations/decl-arr-destructure-defaults.ts：decl arr destructure defaults
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 数组解构：默认值（默认值属于解构元素，不是三元或逻辑表达式）
//  xl:expect BindingElement,As,ArrayType,ArrayLiteral
const [a = 1, b = a] = [] as number[]
console.log(a, b)
