// xl:note 模式里只有一条注释：一个绑定元素都不产（注释不是内容）
// xl:expect ObjectLiteral
// xl:absent BindingElement
const { /*c*/ } = { a: 1 }
