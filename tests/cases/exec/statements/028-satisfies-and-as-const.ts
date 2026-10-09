// xl:title `satisfies` 与 `as const` 都不改运行期的值
// xl:round 331
// xl:judge stdout
// xl:end

const routes = { home: "/", about: "/about" } as const;
const config = { retries: 3 } satisfies { retries: number };
console.log(routes.home, routes.about, config.retries);
console.log(Object.keys(routes).join(","));
