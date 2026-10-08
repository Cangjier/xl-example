// xl:title 自定义错误类：名字、消息与 `instanceof`
// xl:round 330
// xl:judge stdout
// xl:end

class ValidationError extends Error {
  field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
const e = new ValidationError("bad", "email");
console.log(e.name, e.message, e.field);
console.log(e instanceof ValidationError, e instanceof Error, e.constructor === ValidationError);
