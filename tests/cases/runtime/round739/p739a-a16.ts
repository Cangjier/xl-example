// xl:title `await` 与副作用次序（逻辑短路）
// xl:round 739
// xl:judge stdout
// xl:end
const log: string[] = [];
const mark = (v: any) => { log.push(String(v)); return Promise.resolve(v); };
async function main() {
  console.log(await mark(0) || "d");
  console.log(log.join(","));
  console.log(await mark(1) && "T");
  console.log(log.join(","));
}
main();
