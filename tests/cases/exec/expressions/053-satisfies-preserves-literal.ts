// xl:title `satisfies` 不影响运行期值（只是形状检查）
// xl:round 305
// xl:judge stdout
// xl:end

const conf = { mode: "dev", retries: 3 } satisfies { mode: string; retries: number };
console.log(conf.mode, conf.retries, JSON.stringify(conf));
