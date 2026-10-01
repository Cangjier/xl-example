// xl:note 组合场景对抗集（第 66 轮第十五批）：条件类型/映射类型/infer/模板类型/装饰器互相嵌套
// xl:expect Root:1
type Deep<T> = T extends Array<infer U> ? Deep<U> : T extends Promise<infer V> ? Deep<V> : T;
type Unwrap<T> = T extends { a: infer A; b: () => infer B } ? A | B : never;
type Keys<T> = { [K in keyof T as T[K] extends Function ? never : K]-?: T[K] };
class Svc {
  @dec() private readonly m = new Map<string, Array<{ [K in keyof T]: T[K] }>>();
  @dec2 @dec3 method<U extends Record<string, unknown> = {}>(x: U): U extends any ? U : never { return x }
}
type Fmt<T> = `${Extract<keyof T, string>}` extends `${infer H}${infer R}` ? [H, R] : [];
function pick<T, K extends keyof T>(o: T, ...keys: K[]): Pick<T, K> { return o as any }
const enumMap: { [P in 'a' | 'b']: P extends 'a' ? 1 : 2 } = { a: 1, b: 2 };
type Nested = A extends B ? C extends D ? infer E extends F ? G : H : I : J;
type Cond2<T> = T extends Array<infer U extends string> ? `got_${U}` : never;
