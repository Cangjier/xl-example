// xl:note 新节点的对抗形状集（第 66 轮第十一批）：导入类型/括号类型/谓词/索引签名/类型参数/
// 映射键/元组成员/枚举成员/形参/继承段/解构嵌套，各自用最刁的写法压一遍
// xl:expect ImportType:4,ParenthesizedType:5,TypePredicate:3,IndexSignature:2,TypeParameter:5,NamedTupleMember:3,OptionalType,EnumMember:3,Parameter:9,HeritageClause:3,ExpressionWithTypeArguments:5,BindingElement:5
// （ParenthesizedType 由 4 改成 5：第 67 轮起 `((A))` 的**内层**括号也成形，
//   与 TS 的 `ParenthesizedType > ParenthesizedType > TypeReference` 一对一；
//   原来的 4 是把「内层括号不收」这个 bug 写进了期望值。）
type A1 = import("m").X | import("m").Y;
type A2 = Array<import("m").X>;
type A3 = import("m").X[];
type B1 = (A | B)[];
type B2 = ((A));
type B3 = (() => void) | (new () => X);
type C1 = (x: unknown) => x is A;
declare function c2(x: unknown): x is A.B<C>;
declare function c3(x: unknown): asserts x;
interface D1 { readonly [k: string]: T; [k: number]: U }
type D2 = { [K in Keys as `get${K}`]?: V };
type E1 = <T extends A = B>(x: T) => T;
class E2<T, U extends V = W> {}
type E3 = { [K in keyof T as K]-?: T[K] };
type F1 = [a?: A, ...b: B[], c: C?];
enum G1 { A = 1, B = A | 2, C = -3 }
function h1(a?: A, ...rest: B[]) {}
type H2 = new (a: A) => I;
interface I1 extends A.B<C>, D {}
class I2 extends (mixin(A)) implements B.C<D>, E {}
const { a: { b = 1 } = {}, ...rest2 } = obj;
const [p, , ...q] = arr;
