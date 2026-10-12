// xl:note 计算字段后面紧跟模板字面量计算方法：TypeScript 6.0.3 自带 parser 在这里报「';' expected」，
// 但按 TS 语法 ComputedPropertyName 就是 [ AssignmentExpression ]，这段代码合法，故标 ts-invalid 让体检放行。
// xl:ts-invalid
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class C {
  a = 1
  [`m`]() {
    return 1
  }
}
