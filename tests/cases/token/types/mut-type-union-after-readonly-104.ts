// xl:note 类型位修饰词后面的括号也是类型位：`readonly (A | B)[]`
// xl:expect TypeOperator,TypeDefine
// xl:known-gap 注释夹在 `readonly` 与括号之间（或类型与 `[]` 之间）：`readonly (A | B)[]` 整段不成形（r660 探针池 mut-type-union-after-readonly-104）
interface I {
  refs?: readonly /* c */(A | B)[]
}
