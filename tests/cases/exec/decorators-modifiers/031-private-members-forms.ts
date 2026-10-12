// xl:title 私有字段与私有方法：实例 / 静态 / 访问器
// xl:round 323
// xl:judge stdout
// xl:end

class Vault {
  #secret = 1;
  static #shared = 2;
  #read() { return this.#secret + Vault.#shared; }
  get total() { return this.#read(); }
  static get shared() { return Vault.#shared; }
}
const v = new Vault();
console.log(v.total, Vault.shared, Object.keys(v).length);
