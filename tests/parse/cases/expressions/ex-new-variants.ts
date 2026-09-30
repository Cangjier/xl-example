// xl:expect New
// xl:absent Keyword
// xl:note 五种 `new` 写法（含括号里的被构造者 `new (getCtor())()`）都要收成 `New` 节点。
// 这条基线用例原来的期望写着 `Keyword`——那是 `new (…)` 还没被认下时，
// `new` 只好停在 `Common` 上、被关键词升级收走的形状
const a = new A()
const b = new A
const c = new A<T>(1)
const d = new (getCtor())()
const e = new a.b.C()
