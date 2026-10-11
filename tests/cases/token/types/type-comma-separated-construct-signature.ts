// xl:note 同一个逗号分隔的口径套在**构造签名**上：`new (a: number): I, new (b: string): I` 的
// 第一条在修前会被 `MethodDeclarationCloseRule` 抢成一条 `MethodSignature`（多 `Identifier(new)`），
// 修后两条都是 `ConstructSignature`；`abstract new` 那一档按既有口径投成 `MethodSignature`
//（TS 的 `MethodSignature > [AbstractKeyword, new, …]`）。三档都带尾随逗号，量的是同一条收尾判据。
// xl:end
interface One {
  new (a: number): One,
  new (b: string): One
}

interface Two {
  abstract new (a: number): Two,
  abstract new (b: string): Two
}

type Three = {
  new (a: number): Three,
  new (b: string): Three
}
