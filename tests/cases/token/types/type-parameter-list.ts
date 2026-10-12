// xl:note 泛型参数表收成 TypeParameter（类型别名 / 类 / 方法 / 函数类型四处都收；第 66 轮）
// xl:expect TypeParameter:5,GenericType:5
type X<T extends string = "a"> = T;
class C<T, U extends X<T>> {}
interface I { m<K>(error: K): void }
type F = <V>(a: V) => V;
