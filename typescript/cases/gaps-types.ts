// 类型别名行末 ASI 守卫（本轮修复：type-alias-declaration-possible-shape 的 TypeAliasDeclarationScan）
type T = A\n["k"];
type X = number\nexport type { X }
type T11 = A//c\n[];
type Y = 1\ntype Z = 2;
// G2：>> 拆分后宿主 Data 变长，reload 重放会把同一个 ; 以相同源区间压两遍；FromUnits 只留第一份
class C<T, U extends X<T>> {}\ntype F = number;
interface I<T, U extends X<T>> {}\ntype G = number;
