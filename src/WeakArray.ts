export class WeakArray<T extends WeakKey> {

    constructor() {
        this.#finalizationRegistry = new FinalizationRegistry((obj) => {
            this.#items.delete(obj);
        });
    }

    #items = new Set<WeakRef<T>>();
    #finalizationRegistry: FinalizationRegistry<WeakRef<T>>;

    add(obj: T): WeakRef<T> {
        const wref = new WeakRef(obj)
        this.#items.add(wref);
        this.#finalizationRegistry.register(obj, wref);
        return wref;
    }

    remove(obj: WeakRef<T>) {
        this.#items.delete(obj);
    }

    *[Symbol.iterator]() {
        for (const o of this.#items) {
            const v = o.deref();
            if (v)
                yield v;
            else
                this.#items.delete(o);
        }
    }
}