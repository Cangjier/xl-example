// xl:title `keyof` / `typeof` 在类型位，`in` 作类型映射
// xl:judge stdout
// xl:end

const cfg = { a: 1, b: "s" };
type Cfg = typeof cfg;
type K = keyof Cfg;
type Mapped = { [P in K]: Cfg[P] };
const m: Mapped = { a: 2, b: "t" };
console.log(m.a, m.b, Object.keys(m).join(","));
