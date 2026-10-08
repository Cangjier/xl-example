// xl:note 元组成员的名字与 `?:` / `:` / `...` 之间夹一条注释（第 631 轮）
// xl:expect TupleType,NamedTupleMember,OptionalType,TypeDefine,AreaAnnotation
type A = [a /* c */?: number];
type B = [b /* c */: string];
type C = [x /* c */, y?: string];
type D = [...rest /* c */: boolean[]];
type E = [z? /* c */, w: number];
