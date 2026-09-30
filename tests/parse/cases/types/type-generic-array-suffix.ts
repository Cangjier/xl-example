// xl:note 泛型 + 数组后缀的返回类型：`X<A, D>[]` / `Map<string, number>[]`
//（后继闸 IsAllowedFollower 的类型位白名单里只有 `)` 与 `]`、没有 `[`，
//  于是 `>` 后面紧跟 `[` 时这次试读被判否，泛型只吃到 `X<A` 就闭合，
//  整条成员声明认不出来——连 MethodDeclaration 都没有）
// xl:expect MethodDeclaration:4,ReturnType:4,GenericType
interface I1 { m(): X<A, D>[] }
interface I2 { m(): Map<string, number>[] }
interface I3 { m(): X<A> }
interface I4 { m(): X<A, D>[][] }
