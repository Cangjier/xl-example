// xl:expect Interface,InterfaceBody,Field
// xl:note 数字字面量成员名：`1: string` / `2?: number`（数字本身是 Identifier，走的是普通成员名那条路）
interface N {
  1: string
  2?: number
}
