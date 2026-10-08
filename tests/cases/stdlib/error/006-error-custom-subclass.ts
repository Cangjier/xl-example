// xl:title 自定义错误类：继承 Error、带额外字段、能接住
// xl:judge stdout
// xl:end

class ValidationError extends Error {
  field: string;
  constructor(field: string) { super("invalid " + field); this.field = field; this.name = "ValidationError"; }
}
try { throw new ValidationError("email"); }
catch (e: any) { console.log(e.name, e.message, e.field, e instanceof ValidationError, e instanceof Error); }
