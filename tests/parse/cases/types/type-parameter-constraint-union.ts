// xl:note 参数表约束里的联合 / 交叉要成形（第 66 轮第二轮的回归钉子）
// xl:expect UnionType:2,IntersectionType,TypeParameter:2
interface A<I extends null | Writable> {}
type B<T extends string & {} | symbol> = T;
