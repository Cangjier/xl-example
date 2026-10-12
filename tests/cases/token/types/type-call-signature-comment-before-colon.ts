// xl:note 类型字面量里的调用签名：形参表与返回类型标注之间夹**注释**（第 900 轮片段普查量出并收掉）：判据那一跳原来只跳软换行，看到的下一格是注释 ⇒ 括号散成裸 `Bracket`、签名一个都不成形
// xl:round 900
// xl:expect Signature:1,Parameter:1,ReturnType:1,TypeDefine:2,TypeLiteralBody:1
// xl:end
type T = { (a: string)/*c*/: void };
