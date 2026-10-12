// xl:note 下标表达式里的算符要成节点：`a[index + 1]` 的 `+`、`a[i] - b` 的 `-`
//（修前 `Previous` 里「父单元是 `[` 括号就一律不成立」把元素访问一起挡了——
//  那条判据本意是挡映射类型/索引签名，改用括号自己的 Context 之后才分得开）
// xl:expect BinaryOperator:3
const x = a[index + 1];
const y = a[i] - b;
const z = o["k"] + 1;
