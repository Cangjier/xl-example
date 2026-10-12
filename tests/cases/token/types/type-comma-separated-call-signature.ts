// xl:note 接口 / 类型字面量里的成员可以用**逗号**分隔，那一条**无名调用签名**的区间要含那个逗号
//（第 1205 轮收掉：`SignatureCloseRule.HasSignatureTail` 原来只认 `;`，逗号后面还有成员时
//  第一条签名整条不成形——缺 `CallSignature` / `Parameter` / `Identifier` / `NumberKeyword`；
//  `SignatureEndStep` 也从那一轮起跨过 trivia 去量那个分隔符的距离）。
// 三档：接口体里的一条（后面还有成员）、类型字面量里的一条、以及只有一条时的尾随逗号。
// xl:end
interface One {
  (a: number): string,
  (b: string): number
}

type Two = {
  (a: number): string,
  (b: string): number
}

interface Three {
  (a: number): string,
}
