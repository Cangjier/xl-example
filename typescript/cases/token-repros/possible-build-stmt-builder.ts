// xl:note statement-builder 修复的最小复现行（每条都单行、已验证 PASS）。
// xl:note catch 绑定带类型：`:` 之后的类型段提进 VariableDeclaration 的 type 子节点，End 不含尾随注释。
try { } catch (e: unknown) { }
try {} catch (e: unknown/*c*/) {}
// xl:note BuildVariableDeclarationList 的 `,` 扫描数 `<`/`>` 深度：类型实参里的逗号不再被当声明分隔符。
let x: Record<string, number> = y;
// xl:note 初值里 `as` 之后的类型实参同样不按裸 `,` 切。
const r = { a: 1 } as Record<string, number>;
// xl:note 初值里的泛型调用 / new 泛型实参（G1a 残留）也不按裸 `,` 切。
const x = new Map<string, number>();
const y = f<A, B>(1);
const z = a as Foo<A, B>;
