// xl:note C-optchain-nonnull 落点（657 审计语料）
// xl:expect Statement:6,Identifier:4,LineAnnotation:4,SymbolToken:4,Let:2,NotNull:2,Bracket,Method,NullConditionalOperator,Root,TypeDefine
// 第 852 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`a?.b!.c!()` 里 `NonNullExpression` / `PropertyAccessExpression` / `Identifier`
// 三处漂、并多出一格空名属性访问」——`.c!()` 那一格是
// `Method(name="")[NotNull(c, !), Bracket]`，与 `-01` 同一根（见那一份的说明）。
declare const a: any;
let x = a?.b!.c!();
