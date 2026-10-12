// xl:title ID 生成器：自增、前缀、校验位、解析
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class IdGen {
  private counter = 0;
  constructor(private prefix: string, private width: number) {}
  next(): string {
    this.counter += 1;
    const body = this.prefix + String(this.counter).padStart(this.width, "0");
    return body + "-" + this.check(body);
  }
  private check(body: string): string {
    let sum = 0;
    for (let i = 0; i < body.length; i++) sum = (sum * 31 + body.charCodeAt(i)) % 997;
    return String(sum).padStart(3, "0");
  }
  static parse(id: string): { prefix: string; serial: number; valid: boolean } | null {
    const parts = id.split("-");
    if (parts.length !== 2) return null;
    const body = parts[0];
    const serial = Number(body.slice(2));
    const gen = new IdGen(body.slice(0, 2), body.length - 2);
    return { prefix: body.slice(0, 2), serial, valid: gen.check(body) === parts[1] };
  }
}
const gen = new IdGen("AB", 4);
const ids: string[] = [];
for (let i = 0; i < 5; i++) ids.push(gen.next());
console.log(ids.join(","));
console.log(ids.map((id) => JSON.stringify(IdGen.parse(id))).join("\n"));
console.log(IdGen.parse("AB0003-999"), IdGen.parse("bad"), IdGen.parse(ids[0])!.serial);
console.log(new Set(ids).size, ids.every((id) => IdGen.parse(id)!.valid));
