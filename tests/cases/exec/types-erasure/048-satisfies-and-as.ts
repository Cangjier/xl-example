// xl:title satisfies / as / 非空断言在运行期无痕迹
// xl:round 9
// xl:judge stdout
// xl:end

const cfg = { host: "h", port: 1 } satisfies { host: string; port: number };
const num = (cfg.port as unknown as number)!;
console.log(cfg.host, num, JSON.stringify(cfg));
