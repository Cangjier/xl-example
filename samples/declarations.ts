// 声明层与语句层样本：class / interface / enum / function / switch / 装饰器 / async / 标签
// 每一段都对应 README「支持的 TypeScript 构造」里的一项
import { base } from "./base"

@Component({ selector: "app-root" })
export abstract class Repo<T = unknown> extends Base<T> implements Closeable, Named {
    private static readonly created = 0
    protected items: T[] = []

    constructor(public readonly id: string, private readonly cache = new Map<string, T>()) {
        super()
    }

    get size(): number {
        return this.items.length
    }

    set size(value: number) {
        this.items.length = value
    }

    async find<U = string>(key: U): Promise<T | undefined> {
        const hit = this.cache.get(key)
        return hit ?? undefined
    }

    static create<T>(seed: T): Repo<T> {
        return new Repo<T>(seed)
    }
}

export interface Named {
    readonly name: string
    rename?(next: string): void
}

export enum Color {
    Red,
    Green = 2,
    Blue = "blue",
}

export const enum Flag {
    On = 1,
    Off = 0,
}

export function identity<T>(value: T): T {
    return value
}

export async function load(path: string): Promise<void> {
    const text = await read(path)
    console.log(path + ": " + text)
}

declare function ambient(flag: boolean): string | undefined

class Worker {
    run(handler: Handler): void {
        outer: while (true) {
            switch (handler.name) {
                case "a":
                    break outer
                case pick(1, 2):
                    handler("b")
                    break
                default:
                    break
            }
        }
        try {
            throw new Error("boom")
        } catch (error) {
            console.warn(error)
        } finally {
            handler("done")
        }
    }
}
