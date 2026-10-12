// xl:title 私有成员：`#n` / `#m()` / `static #s`
// xl:judge stdout
// xl:end

class Account {
  #balance = 0;
  static #count = 0;
  constructor() { Account.#count++; }
  #clamp(v: number): number { return v < 0 ? 0 : v; }
  deposit(v: number): void { this.#balance = this.#clamp(this.#balance + v); }
  get balance(): number { return this.#balance; }
  static get count(): number { return Account.#count; }
}
const a = new Account();
a.deposit(10);
a.deposit(-3);
console.log(a.balance, Account.count, Object.keys(a).length);
