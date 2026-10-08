// xl:title 错误家族：name / message / instanceof / 自定义子类
// xl:judge stdout
// xl:end

try { throw new TypeError("bad type"); } catch (e: any) {
  console.log(e.name, e.message, e instanceof TypeError, e instanceof Error);
}
class MyError extends Error {
  code = 42;
  constructor(message: string) { super(message); this.name = "MyError"; }
}
try { throw new MyError("custom"); } catch (e: any) {
  console.log(e.name, e.message, e.code, e instanceof MyError, e instanceof Error);
}
