// xl:note 换行落在 `const` 与解构模式之间
// xl:expect Let,TypeDefine,Identifier
declare const o: any
const
{ a, b: c, d = 1, ...rest } = o;
