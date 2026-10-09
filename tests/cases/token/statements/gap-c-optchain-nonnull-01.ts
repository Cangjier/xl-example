// xl:note C-optchain-nonnull 落点（657 审计语料）
// xl:expect Statement:7,LineAnnotation:5,Identifier:3,Let:2,SymbolToken:2,Bracket,Method,NotNull,NullConditionalOperator,Root,TypeDefine
// 第 852 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`a?.b!()` 缺一格 `NonNullExpression`」——`?.` 之后那一格是
// `Method(name="")[NotNull(b, !), Bracket]`（被调用者自己带着 `!`），
// 而投影那两条路都只按 `name` 折一格属性访问（名字是空串）。折法收进
// `print-ast-common.xl.md` 的 `assertedMember`：先接成员、再把 `!` 套在整条链上。
declare const a: any;
let x = a?.b!();
