// xl:title satisfies 是纯检查：产物一个指令都不该多
// xl:judge stdout
// xl:end

const config = { host: "h", port: 1 } satisfies { host: string; port: number };
const list = [1, 2] satisfies number[];
const nested = { a: { b: 1 } } satisfies Record<string, unknown>;
console.log(config.port, list.length, nested.a.b);
