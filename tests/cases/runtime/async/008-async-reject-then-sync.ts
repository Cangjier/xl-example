// xl:title 被拒绝的 async 之后的同步语句：先同步、后微任务
// xl:round 298
// xl:judge stdout
// xl:end

class Box {
  private data = new Map<string, number>();
  add(key: string, value: number): void { this.data.set(key, value); }
  async total(key: string): Promise<number> {
    const found = this.data.get(key);
    if (found === undefined) throw new Error("no key " + key);
    return found;
  }
}
const box = new Box();
box.add("a", 1);
box.total("zzz").catch((e: any) => console.log("caught", e.message));
console.log("sync after");
