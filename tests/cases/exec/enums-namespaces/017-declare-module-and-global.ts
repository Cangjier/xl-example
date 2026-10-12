// xl:title declare module / declare global 一条运行期指令都不产生
// xl:judge stdout
// xl:end

declare module "some-lib" {
  export const value: number;
}
declare global {
  interface Window { z: number }
}
declare const ambient: number;
console.log("ok", typeof ambient);
