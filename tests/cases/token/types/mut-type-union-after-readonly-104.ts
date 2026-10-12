// xl:note 类型位修饰词后面的括号也是类型位：`readonly (A | B)[]`
// xl:expect TypeOperator,TypeDefine
interface I {
  refs?: readonly /* c */(A | B)[]
}
