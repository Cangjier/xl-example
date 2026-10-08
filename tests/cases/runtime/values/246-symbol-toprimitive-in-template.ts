// xl:title Symbol.toPrimitive 决定模板串与加法的结果
// xl:round 7
// xl:judge stdout
// xl:end

const money = {
  amount: 7,
  [Symbol.toPrimitive](hint: string): string | number {
    return hint === "string" ? this.amount + " yuan" : this.amount;
  },
};
console.log(`${money}`, "cost " + money, money + 1);
