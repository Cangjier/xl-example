// xl:title 自定义错误子类：继承 / 字段 / name / instanceof / 捕获
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 7 条并成这一条
// （保留 006-error-custom-subclass；吸收 014-error-custom-subclass-forms · 020-error-subclass-forms · 024-error-subclass-shapes · 027-error-subclass · 033-arg-error-shape · 035-error-subclass-name）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `extends Error` 的那一层：构造器里的 super / 额外字段 / name 自己的那一格 / 两级继承 / 抛出来接得住

// 保留条本身：006-error-custom-subclass.ts
(() => {

  class ValidationError extends Error {
    field: string;
    constructor(field: string) { super("invalid " + field); this.field = field; this.name = "ValidationError"; }
  }
  try { throw new ValidationError("email"); }
  catch (e: any) { console.log(e.name, e.message, e.field, e instanceof ValidationError, e instanceof Error); }
})();

// 吸收 014-error-custom-subclass-forms.ts
(() => {

  class AppError extends Error {
    code: number;
    constructor(msg: string, code: number) { super(msg); this.code = code; this.name = "AppError"; }
  }
  const e = new AppError("bad", 42);
  console.log(e.message, e.code, e.name, e instanceof AppError, e instanceof Error);
  console.log(String(e));
})();

// 吸收 020-error-subclass-forms.ts
(() => {

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
})();

// 吸收 024-error-subclass-shapes.ts
(() => {
  class AppError extends Error {
    code: number;
    constructor(message: string, code: number) {
      super(message);
      this.name = "AppError";
      this.code = code;
    }
  }
  class NotFound extends AppError {
    constructor(what: string) { super("missing " + what, 404); this.name = "NotFound"; }
  }
  try { throw new NotFound("file"); } catch (e) {
    const err = e as NotFound;
    console.log(err.name, err.message, err.code, err instanceof NotFound, err instanceof AppError, err instanceof Error);
  }
  console.log(String(new AppError("m", 1)));
})();

// 吸收 027-error-subclass.ts
(() => {

  class MyError extends Error { constructor(m: string) { super(m); this.name = "MyError"; } }
  const e = new MyError("boom");
  console.log(e.name, e.message, e instanceof MyError, e instanceof Error);
  const w = new Error("outer", { cause: new Error("inner") } as any);
  console.log((w as any).cause.message);
})();

// 吸收 033-arg-error-shape.ts
(() => {
  class MyErr extends Error { code: number; constructor(code: number) { super('code ' + code); this.code = code; this.name = 'MyErr'; } }
  const e: any = new MyErr(7);
  try { console.log("name", String(e.name)); } catch (e) { console.log("name", "ERR", String(e && e.name)); }
  try { console.log("message", String(e.message)); } catch (e) { console.log("message", "ERR", String(e && e.name)); }
  try { console.log("code", String(e.code)); } catch (e) { console.log("code", "ERR", String(e && e.name)); }
  try { console.log("instanceof", String([e instanceof MyErr, e instanceof Error].join(','))); } catch (e) { console.log("instanceof", "ERR", String(e && e.name)); }
})();

// 吸收 035-error-subclass-name.ts
(() => {
  class MyErr extends Error { constructor(m: string) { super(m); this.name = "MyErr"; } }
  const e: any = new MyErr("boom");
  console.log(e.name, e.message, e instanceof MyErr, e instanceof Error);
  console.log(new TypeError("x").name, new RangeError("y").message);
  console.log(Error("z").message, String(new Error()));
})();
