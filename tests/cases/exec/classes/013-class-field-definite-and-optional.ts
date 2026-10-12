// xl:title `n!: number` 与 `m?: string` 两种字段声明
// xl:judge stdout
// xl:end

class C {
  n!: number;
  m?: string;
  o: number = 0;
  init(): void { this.n = 1; }
}
const c = new C();
c.init();
console.log(c.n, c.m, c.o, "m" in c, JSON.stringify(c));
