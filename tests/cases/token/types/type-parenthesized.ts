// xl:note 括号类型：类型位的 `(A | B)` / `((a: A) => B)` / `(A & B)[]` 各收成 ParenthesizedType（第 66 轮第五批）
// xl:expect ParenthesizedType:3,UnionType:2,IntersectionType,ArrayType,FunctionType,Let
type P = (A | B);
type Q = ((a: A) => B) | C;
let v: (A & B)[];
