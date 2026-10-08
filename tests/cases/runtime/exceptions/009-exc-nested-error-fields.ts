// xl:title 错误对象上的自定义字段 + 嵌套抛出 + `instanceof` 分派
// xl:judge stdout
// xl:end

class Http extends Error {
  status: number;
  constructor(status: number, msg: string) { super(msg); this.name = "Http"; this.status = status; }
}
try {
  try { throw new Http(404, "nf"); } catch (e) { throw e; }
} catch (e: any) {
  console.log(e.name, e.status, e.message, e instanceof Http, e instanceof Error);
}
