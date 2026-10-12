// xl:note 下标调用链后面还接着点号与调用（第 743 轮一并收掉）
// xl:expect PropertyAccess,Bracket,Method,String,BinaryOperator
const o: any = { f: () => ({ v: 1 }) };
const r = o["f"]().v.toString() + "";
