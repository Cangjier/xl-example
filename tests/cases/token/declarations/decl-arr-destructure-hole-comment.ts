// xl:note 数组解构的洞：洞里只有一条注释，那一格仍是洞（不产绑定元素）
// xl:expect BindingElement:2
const [first, /*c*/ , third] = [1, 2, 3]
