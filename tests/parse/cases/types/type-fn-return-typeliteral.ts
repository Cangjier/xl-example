// xl:note 函数类型的返回类型字面量：`(opts: X) => { a: number }`
//（TypeLiteralReorganization.IsTypePosition 往前扫到 `=>` 时默认判值位，
//  于是那个 `{` 退化成裸 Bracket、TypeLiteral 一个都不出；
//  `undici-types/mock-interceptor.d.ts` 的 MockReplyOptionsCallback 与
//  `@types/node/http2.d.ts` 里成片的 `listener: () => {}` 都是这一形状）
// xl:expect TypeLiteral:6,TypeLiteralBody:6
type A1 = (opts: X) => { a: number }
type A2 = (opts: X) => { a: number, b: string }
type A3 = (opts: X) => { a: number; b: string }
type A4 = () => { a: number }
type A5 = (opts: X) => { a?: T | Buffer | string }
interface I1 { m(cb: () => { a: number }): void }
