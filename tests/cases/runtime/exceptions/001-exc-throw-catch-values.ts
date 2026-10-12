// xl:title `throw` 什么都能扔：字符串、数、对象、Error
// xl:judge stdout
// xl:end

function attempt(v: any): string {
  try { throw v; } catch (e: any) { return typeof e === "object" ? e.message : String(e); }
}
console.log(attempt("plain"), attempt(7), attempt({ message: "obj" }), attempt(new Error("real")));
