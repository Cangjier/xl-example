// xl:title AST 语料 declarations/decl-obj-destructure-nested.ts：decl obj destructure nested
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 对象解构：嵌套对象/数组解构与改名并存（第 66 轮第八批之后模式留在树里，
// 左侧的模式与右侧的字面量各算一个 ObjectLiteral/ArrayLiteral，另加四个 BindingElement）
//  xl:expect ObjectLiteral:4,ArrayLiteral:2,BindingElement:4,Let
const { a: { b }, c: [d] } = { a: { b: 1 }, c: [2] }
console.log(b, d)
