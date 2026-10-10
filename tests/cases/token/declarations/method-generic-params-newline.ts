// xl:note 方法的**类型参数表与形参表之间**换行（第 934 轮收掉的
// `gap-r933-overload-generic-newline` 那一族）：成员体里的 ASI 不管换行，
// 「名字（+ 类型参数段）+ `(`」永远读成一条方法声明 / 方法签名。
// 守卫八档：同行 / 换行 / 带体 / 两个类型参数 / 接口 / 抽象 / 名字与 `<T>` 之间换行 / 跨注释。
// xl:round 934
// xl:end
class A { m<T>(a:T):void; m(a) {} }
class B { m<T>
(a:T):void; m(a) {} }
class C { m<T>
(a:T) {} }
class D { m<T,U>
(a:T,b:U):void; m(a,b) {} }
interface I { m<T>
(a:T):void; }
interface J { m<T>(a:T):void; }
abstract class E { abstract m<T>
(a:T):void; }
class F { m<T>/*c*/(a:T):void; m(a) {} }
class G { m
<T>(a:T):void; m(a) {} }
