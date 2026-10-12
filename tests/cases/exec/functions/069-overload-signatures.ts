// xl:title 重载声明：只有最后那个实现是运行期代码
// xl:round 7
// xl:judge stdout
// xl:end

function pick(n: number): string;
function pick(s: string): number;
function pick(v: any): any { return typeof v === "number" ? "n" + v : v.length; }
console.log(pick(1), pick("abc"), pick.length);
class C {
  m(x: number): number;
  m(x: string): string;
  m(x: any): any { return x; }
}
console.log(new C().m(1), new C().m("s"));
