// xl:note 同一条「注释不算内容 / 不算首位」的规则在另外三个宿主里：嵌套模式、for-of、catch
// xl:expect BindingElement
const { a: /*c*/ { b } } = { a: { b: 1 } }
for (const [x, /*c*/ , y] of [[1, 2, 3]]) { x + y }
try { } catch (/*c*/ { message }) { message }
