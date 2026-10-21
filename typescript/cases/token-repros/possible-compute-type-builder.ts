// xl:note type-builder 家族修复的最小单行用例（task-13 + conditional-infer 尾巴）：JSDocNonNullableType 类型后缀、可选无类型成员、无返回类型调用签名、元组具名可选、mapped 值后成员/空方括号、条件类型 infer 约束回退。
type T1 = a!;
type T2 = (a!);
type T3 = Box<a!>;
const q1 = f() as T!;
const q2 = f() as T![]; 
interface I1 { a? }
interface I2 { a?; }
type T4 = { (a: string) };
type T5 = [A?, ...B, C, name: D?, ...rest: E[]];
type T6 = { [K in keyof U]:U; [X]: A };
type T7 = { [K in keyof U as `k${K}`]:U
[K] };
type T8 = { [K in keyof U]:U
[] };
type N1 = A extends B ? C extends D ? infer E extends F ? G : H : I : J;
type N2 = infer E extends F ? G : H;
type N3 = A extends infer E extends B ? E : never;
type N4 = A extends B ? infer E extends F : G;
type N5 = infer E extends F;