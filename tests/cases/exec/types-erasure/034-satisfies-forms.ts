// xl:title `satisfies` 不改值：对象、数组与函数
// xl:round 330
// xl:judge stdout
// xl:end

const config = { port: 8080, host: "local" } satisfies { port: number; host: string };
console.log(config.port, config.host);
const list = [1, 2, 3] satisfies number[];
console.log(list.length, list[1]);
