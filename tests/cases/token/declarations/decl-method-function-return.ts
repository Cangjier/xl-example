// xl:note 返回类型**自己带括号**时（函数类型 / 括号类型 / 构造签名），紧邻方法体的那个括号
// 是返回类型的一部分、不是形参表 ⇒ `BodyIndex` 拿它跟形参表比原文必然不等 ⇒ 整条成员
// 退化成一次调用加一个裸 `TypeDefine`（`<Method name="m">` + `<FunctionType>` 抢走方法体）。
// xl:expect MethodDeclaration,ReturnType,FunctionType
class Emitter<T> {
  on(fn: (payload: T) => void, options: { once?: boolean } = {}): () => void {
    return () => fn(options as T);
  }
  pick(): (y: number) => number {
    return (y) => y;
  }
  plain(a: number): void {
    return;
  }
}
