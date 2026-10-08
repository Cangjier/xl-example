// xl:expect Foreach,ForeachEnumable,ObjectLiteral
// xl:note `of` 右边是**值**：`for (const v of { [Symbol.iterator]: () => it } as any)` 里
// 那个花括号是对象字面量，不是类型字面量（链子是 `of` → `const`，按类型位判会整份文件进不来）
const it = [1, 2, 3];
for (const v of { [Symbol.iterator]: () => it } as any) console.log(v);
