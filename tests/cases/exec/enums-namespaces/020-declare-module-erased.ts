// xl:title declare module / declare global 一行运行期东西都不产生
// xl:round 291
// xl:judge stdout
// xl:end

declare module "x" { export const y: number; }
declare global { interface Window { z: number } }
console.log("ok", 1);
