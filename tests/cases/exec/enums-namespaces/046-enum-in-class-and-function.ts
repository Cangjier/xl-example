// xl:title 枚举在有运行期语义的内层作用域里
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
enum E { A = "a", B = "b" }
function pick(k: string): string { return k === "a" ? E.A : E.B; }
class Holder { tag = E.A; static all = [E.A, E.B]; m(): string { return E.B; } }
const arrow = (): string => E.A + E.B;
console.log(pick("a"), new Holder().tag, Holder.all.join(","), new Holder().m(), arrow());
