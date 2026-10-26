namespace Store {
  export interface Item {
    id: number;
    name: string;
    tags?: string[];
  }

  export enum Kind {
    A = "a",
    B = "b",
  }

  export type Id = number | string;

  const items: Item[] = [];

  export function add(item: Item): void {
    items.push(item);
  }

  export function find(id: Id): Item | undefined {
    const key = typeof id === "number" ? id : Number(id);
    return items.find((item) => item.id === key);
  }

  export class Repo {
    constructor(public readonly kind: Kind) {}

    list(): Item[] {
      return items.slice();
    }
  }
}

const repo = new Store.Repo(Store.Kind.A);
Store.add({ id: 1, name: "球", tags: ["round"] });
console.log(repo.list(), Store.find("1"));
