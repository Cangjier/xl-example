// xl:title 自定义错误：字段、name、instanceof、String(e)
// xl:judge stdout
// xl:end

class ValidationError extends Error {
  field: string;
  constructor(field: string, msg: string) {
    super(msg);
    this.name = "ValidationError";
    this.field = field;
  }
}
const e = new ValidationError("age", "too young");
console.log(e.message, e.field, e.name);
console.log(String(e));
console.log(e instanceof ValidationError, e instanceof Error);
try { throw e; } catch (x) { console.log((x as ValidationError).field, (x as Error).message); }
