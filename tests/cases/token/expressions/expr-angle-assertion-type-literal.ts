// xl:expect GenericType,TypeLiteral,ObjectLiteral
// xl:note 尖括号断言的类型是**类型字面量**：`<T>` 与它后面那一格一起才是操作数，
// 而那个 `{ n: number }` 是类型位（`TypeLiteral`）、后面那个 `{ n: 1 }` 是值位（对象字面量）
const a = <{ n: number }>{ n: 1 };
const b = (<{ n: number; m?: string }>{ n: 2, m: "x" }).m;
console.log(a.n, b);
