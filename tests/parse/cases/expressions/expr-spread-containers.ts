// xl:note 展开运算符在四种容器里都要成形：调用实参、数组字面量（含嵌在调用实参里的）、
// 对象字面量（可以多个）、`new` 的实参。用**个数**断言就是为了钉住「一个都不能少」——
// 曾经为了压掉调用签名里 rest 参数造成的假阳性而加过一层判据，结果把 `f([...xs])` 压成了 0 个
// xl:expect Spread:6,Method,ArrayLiteral,ObjectLiteral,New
call(...args);
const list = [...items];
f([...xs]);
const merged = { ...base, ...extra };
const made = new Foo(...parts);
