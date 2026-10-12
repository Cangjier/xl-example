// xl:title 穷尽性检查（default 里给 never）与运行期无关
// xl:round 371
// xl:judge stdout
// xl:end
type Kind = "a" | "b";
function handle(k: Kind): string {
  switch (k) {
    case "a": return "A";
    case "b": return "B";
    default: {
      const unreachable: never = k;
      return String(unreachable);
    }
  }
}
console.log(handle("a"), handle("b"), handle("c" as Kind));
const map: Record<Kind, number> = { a: 1, b: 2 };
console.log(map.a + map.b);
