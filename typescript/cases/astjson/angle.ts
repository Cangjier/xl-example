// angle 判据守卫：`<`/`>` 是类型实参/类型参数，还是算术/比较（AngleJudge 唯一判据的常驻用例）
// base 在前、变体在后（IMPORTANCE §5）。一行一用例。
a < b;
a < b > c;
a << b;
a >> b;
a >>> b;
a <= b;
a >= b;
x = y < z;
a < b && c > d;
f<T>(x);
f<A, B>(x);
detached<A>(1);
new Map<K, V>();
obj.f<T>(x);
class C<T extends U> {}
interface I<T> {}
type X = A<B<C>>;
f<T>`t`;
f<A>(x) < y;
