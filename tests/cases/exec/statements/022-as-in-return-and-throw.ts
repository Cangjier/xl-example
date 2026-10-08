// xl:title `as` 落在 return 与 throw 的表达式里
// xl:round 304
// xl:judge stdout
// xl:end

function parse(s: string): number {
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error("bad: " + s) as Error;
  return n as number;
}
console.log(parse("3"));
try {
  parse("x");
} catch (e: any) {
  console.log(e.message);
}
