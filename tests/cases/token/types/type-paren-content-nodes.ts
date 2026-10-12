// xl:note 括号类型里的类型文本必须成形（第 67 轮）：`(keyof T)` / `([A, B])` / `(infer U)` …
// 这些内容是在**括号关闭那一刻**重组的，那一刻「往上找类型容器」还断着；
// 括号被收成 ParenthesizedType 之后要重跑一遍括号自己的队列才认得出来。
// xl:expect ArrayType:12,ParenthesizedType:12,TypeOperator:3,LiteralType:3,TypeQuery:1,TupleType:1,IndexedAccessType:1,InferType:1,TypeParameter:1
type P1 = (keyof X)[];
type P2 = (readonly Y[])[];
type P3 = (unique symbol)[];
type P4 = (typeof x)[];
type P5 = ([A, B])[];
type P6 = (C["k"])[];
type P7 = ("lit")[];
type P8 = (1)[];
type P9 = (F<A>)[];
type P10 = T extends (infer U)[] ? U : never;
type P11 = ((A))[];
