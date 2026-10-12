// xl:title 账本：自定义错误类 + `try/catch` + `reduce` + 排序
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class InsufficientFunds extends Error {
  constructor(readonly needed: number, readonly have: number) {
    super("need " + needed + " have " + have);
    this.name = "InsufficientFunds";
  }
}
class Account {
  private balance = 0;
  private log: string[] = [];
  deposit(n: number): void { this.balance += n; this.log.push("+" + n); }
  withdraw(n: number): void {
    if (n > this.balance) throw new InsufficientFunds(n, this.balance);
    this.balance -= n;
    this.log.push("-" + n);
  }
  get amount(): number { return this.balance; }
  history(): string { return this.log.join(" "); }
}
const a = new Account();
a.deposit(100);
a.withdraw(30);
try { a.withdraw(1000); } catch (e) {
  const err = e as InsufficientFunds;
  console.log(err.name, err.needed, err.have, err instanceof Error, err.message);
}
console.log(a.amount, a.history());
