// xl:expect Interface,InterfaceBody,Field,GenericType
// xl:note 类型参数里的联合约束（`I extends null | Writable`）：`|` 必须在类型实参字母表里，
// 否则扫描在第一个 `|` 处中止，类型参数段认不出来，整条接口跟着塌掉
//（`@types/node/child_process.d.ts` 的 ChildProcessByStdio 就是这样丢的）
interface ByStdio<I extends null | Writable, O extends null | Readable>
  extends ChildProcess
{
  stdin: I
  stdout: O
}
