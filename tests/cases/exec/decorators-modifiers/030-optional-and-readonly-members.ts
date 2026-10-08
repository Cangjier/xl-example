// xl:title 可选成员与只读成员的读法：只影响类型、不影响运行期
// xl:round 323
// xl:judge stdout
// xl:end

interface Cfg { readonly host: string; port?: number }
const c: Cfg = { host: "h" };
console.log(c.host, c.port, "port" in c, Object.keys(c).join(","));
