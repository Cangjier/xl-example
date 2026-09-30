// xl:note 泛型约束里「嵌套泛型 + 联合/交叉」：`T extends Array<X> | Y`
//（`ScanArguments` 的字母表认 `|`，但后继闸 IsAllowedFollower 的类型位白名单里没有它——
//  于是那次试读被判否、整个 <…> 退回 Symbol，整条声明跟着塌掉。
//  实测 typescript.d.ts 的 `visitNodes<TIn extends Node, TInArray extends NodeArray<TIn> | undefined, TOut extends Node>`
//  两个重载一个都产不出）
// xl:expect Function:6,GenericType:12
declare function f1<T extends Array<X>>(a: T): void;
declare function f2<T extends Array<X> | Y>(a: T): void;
declare function f3<T extends Array<X>|Y>(a: T): void;
declare function f4<T extends A.B<X> | Y>(a: T): void;
declare function f5<T extends Record<string, X> | undefined>(a: T): void;
declare function f6<T extends X<Y> | Z, U extends W>(a: T): void;
