// xl:title 枚举的初始化式引用前面的成员（含遮蔽外层同名变量）
// xl:round 378
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// TS 的规矩：枚举成员的初始化式可以**不带前缀**引用这条 enum 里前面的成员。
enum Level { Low = 1, Mid = Low + 1, High = Mid * 2 }
console.log("A", Level.Low, Level.Mid, Level.High, Level[2], Level[4]);
enum Flags { None = 0, A = 1 << 0, B = 1 << 1, Both = A | B, All = None | A | B | Both }
console.log("B", Flags.A, Flags.B, Flags.Both, Flags.All, Flags[3], Flags[1]);
const enum Const { X = 2, Y = X * X, Z = Y + X }
console.log("C", Const.X, Const.Y, Const.Z, Object.keys(Const).join(","));
enum Mixed { A = "x".length, B = A + 4, C = B << 1 }
console.log("D", Mixed.A, Mixed.B, Mixed.C, Mixed[5]);
// **成员名只属于那条 enum**：外层同名的变量照旧、被闭包捕获的那个也不许被改。
function scoped(): string {
  let A = 1;
  const read = (): number => A;
  enum E { A = 2, B = A + 1 }
  return [A, E.A, E.B, read()].join(",");
}
console.log("E", scoped());
function outer(): string {
  const base = 10;
  enum F { A = base, B = base * 2 }
  return [base, F.A, F.B].join(",");
}
console.log("F", outer());
