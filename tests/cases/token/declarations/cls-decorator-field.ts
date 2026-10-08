// xl:note 字段装饰器：`@dec x = 1` 是一个装饰器加一个**字段**，`x` 是字段名。
// 曾经装饰器的名字扫描会把裸名字一路吃下去，`x` 被拼进 `name`，
// 产物退化成 `<Decorator name="dec.x">` + `<SymbolToken>=</SymbolToken><Identifier>1</Identifier>`
// ——**字段整个消失**。判据是「名字之间必须有 `.`」：`@ns.dec` 才是多段名字。
// xl:expect Decorator,Field
class A {
  @dec x = 1
}
