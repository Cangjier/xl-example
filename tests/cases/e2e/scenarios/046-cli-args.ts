// xl:title 命令行参数解析：两种写法、缺省值、未知项
// xl:round 331
// xl:judge stdout
// xl:end

function parse(argv: string[]): { flags: Record<string, string | boolean>; rest: string[] } {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    if (eq >= 0) {
      flags[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[token.slice(2)] = next;
      i = i + 1;
      continue;
    }
    flags[token.slice(2)] = true;
  }
  return { flags, rest };
}
const parsed = parse(["--name=ada", "--verbose", "--out", "dist", "input.ts", "extra.ts"]);
console.log(parsed.flags["name"], parsed.flags["verbose"], parsed.flags["out"]);
console.log(parsed.rest.join(","));
console.log(Object.keys(parsed.flags).sort().join(","));
