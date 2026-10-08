// xl:note 换行落在 `const` 与解构模式之间
// xl:known-gap `Let` 那一趟按「紧邻」找模式，中间那个换行让它整条解体（缺 11 / 多 15）
// xl:expect Let,TypeDefine,Identifier
declare const o: any
const
{ a, b: c, d = 1, ...rest } = o;
