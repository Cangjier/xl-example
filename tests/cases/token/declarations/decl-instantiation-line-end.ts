// xl:note 实例化表达式的后继字符：配对 `>` 后面是**行尾**时照样成形（行尾本身就是放行条件）
// xl:expect GenericType:2
const f = a<b>
const g = a.b.c<string>
