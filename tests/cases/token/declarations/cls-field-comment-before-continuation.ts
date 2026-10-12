// xl:note 成员字段的名字与延续符号之间夹一条注释：仍是一条 Field（第 631 轮）
// xl:expect ClassBody,Field,TypeDefine,AreaAnnotation,SymbolToken
class A {
  a /* deprecated */ = 1;
  b /* c */ ?: number;
  c /* c */ : string;
  d /* c */ !: number;
}
interface I {
  e /* c */: string;
  f /* c */ ?: number;
}
