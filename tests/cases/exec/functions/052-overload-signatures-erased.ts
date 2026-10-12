// xl:title 重载签名只是声明，实现体才是运行期的东西
// xl:round 371
// xl:judge stdout
// xl:end
function fmt(x: number): string;
function fmt(x: string): string;
function fmt(x: number | string): string { return typeof x === "number" ? "n" + x : "s" + x; }
class C {
  run(x: number): string;
  run(x: string): string;
  run(x: any): string { return "r" + x; }
}
console.log(fmt(1), fmt("a"), new C().run(2), new C().run("b"), fmt.length);
