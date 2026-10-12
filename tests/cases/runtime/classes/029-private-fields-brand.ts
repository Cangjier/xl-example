// xl:title 私有字段：品牌检查、继承里的可见性、跨实例访问
// xl:round 371
// xl:judge stdout
// xl:end
class Vault {
  #secret = 1;
  static #shared = "s";
  get secret(): number { return this.#secret; }
  static same(a: Vault, b: Vault): boolean { return a.#secret === b.#secret; }
  static brand(o: unknown): boolean { return #secret in (o as object); }
  static shared(): string { return Vault.#shared; }
}
class Sub extends Vault {}
const a = new Vault();
const b = new Vault();
console.log(a.secret, Vault.same(a, b), Vault.brand(a), Vault.brand({}), Vault.brand(new Sub()));
console.log(Vault.shared(), new Sub().secret);
