// xl:title switch 里的类型标注、块作用域与贯穿
// xl:round 371
// xl:judge stdout
// xl:end
type Cmd = "add" | "del" | "list";
function run(cmd: Cmd, n: number): string {
  let acc = 0;
  switch (cmd) {
    case "add": {
      const step: number = n;
      acc += step;
      break;
    }
    case "del":
      acc -= n;
    case "list":
      acc += 100;
      break;
    default: {
      const never: never = cmd;
      acc = -1;
    }
  }
  return String(acc);
}
console.log(run("add", 5), run("del", 5), run("list", 1));
