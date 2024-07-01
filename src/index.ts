export type CacheUpdated<T = any> = { prev?: T; next: T }
export type JSONDataObject = { data: Record<string, any> }

export interface CacheStore {
  /**
   * Adds or updates a record in store with the given value and key.
   * The first argument of the `update` function is the previous value
   * (can be `undefined` if there is no previous value) of the given key.
   * This operation is atomic.
   */
  put<T = any>(
    key: string,
    update: (prev: T | undefined) => T
  ): Promise<CacheUpdated<T>>

  /**
   * Adds or updates a record in store with the given value and key.
   */
  set<T = any>(key: string, value: T): Promise<void>

  /**
   * Retrieves the value by the given key. Returns `undefined` if there
   * is no value for the key.
   */
  get<T = any>(key: string): Promise<T | undefined>

  /**
   * Deletes record in store with the given key.
   */
  remove(key: string): Promise<void>

  /**
   * Deletes all records in store.
   */
  clear(): Promise<void>

  /**
   * This method is only used to check if the database is opened.
   * You don't need to call this method before calling any other methods
   * (`put`, `set`, `get`, `remove` and `clear`).
   */
  ready(): Promise<void>
}

export class IndexedCacheStore implements CacheStore {
  private db?: IDBDatabase
  private dp: Promise<IDBDatabase>

  constructor(name: string) {
    this.dp = new Promise<IDBDatabase>((resolve, reject) => {
      const req = window.indexedDB.open(name)
      req.onerror = reject
      req.onupgradeneeded = () => req.result.createObjectStore('data')
      req.onsuccess = () => {
        this.db = req.result
        resolve(req.result)
      }
    })
  }

  private store(
    mode: 'readwrite' | 'readonly',
    onerror: (error: Error) => void,
    onsuccess: (store: IDBObjectStore) => void
  ) {
    if (this.db) {
      onsuccess(this.db.transaction('data', mode).objectStore('data'))
    } else {
      this.dp
        .then((db) => {
          onsuccess(db.transaction('data', mode).objectStore('data'))
        })
        .catch(onerror)
    }
  }

  async ready() {
    await this.dp
  }

  async get<T = any>(key: string) {
    return new Promise<T | undefined>((resolve, reject) => {
      this.store('readonly', reject, (store) => {
        const get = store.get(key)
        get.onerror = reject
        get.onsuccess = () => resolve(get.result)
      })
    })
  }

  async set<T = any>(key: string, value: T) {
    return new Promise<void>((resolve, reject) => {
      this.store('readwrite', reject, (store) => {
        const put = store.put(value, key)
        put.onerror = reject
        put.onsuccess = () => resolve()
      })
    })
  }

  async put<T = any>(key: string, update: (prev: T | undefined) => T) {
    return new Promise<CacheUpdated<T>>((resolve, reject) => {
      this.store('readwrite', reject, (store) => {
        const get = store.get(key)

        get.onerror = reject
        get.onsuccess = () => {
          try {
            const prev = get.result
            const next = update(prev)
            const put = store.put(next, key)
            put.onerror = reject
            put.onsuccess = () => resolve({ prev, next })
          } catch (err) {
            reject(err)
          }
        }
      })
    })
  }

  async remove(key: string) {
    return new Promise<void>((resolve, reject) => {
      this.store('readwrite', reject, (store) => {
        const del = store.delete(key)
        del.onerror = reject
        del.onsuccess = () => resolve()
      })
    })
  }

  async clear() {
    return new Promise<void>((resolve, reject) => {
      this.store('readwrite', reject, (store) => {
        const clear = store.clear()
        clear.onerror = reject
        clear.onsuccess = () => resolve()
      })
    })
  }
}

export class LocalStorageCacheStore implements CacheStore {
  private readonly name: string

  constructor(name: string) {
    this.name = name
  }

  private getJSON(): JSONDataObject {
    const text = localStorage.getItem(this.name)
    return text ? JSON.parse(text) : { data: {} }
  }

  private putJSON(json: JSONDataObject) {
    localStorage.setItem(this.name, JSON.stringify(json))
  }

  async ready() {
    // nothing
  }

  async put<T = any>(
    key: string,
    update: (prev: T | undefined) => T
  ): Promise<CacheUpdated<T>> {
    const json = this.getJSON()
    const prev = json.data[key]
    const next = update(prev)

    json.data[key] = next
    this.putJSON(json)

    return { prev, next }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    const json = this.getJSON()
    json.data[key] = value
    this.putJSON(json)
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.getJSON().data[key]
  }

  async remove(key: string) {
    const json = this.getJSON()
    json.data[key] = undefined
    this.putJSON(json)
  }

  async clear() {
    localStorage.removeItem(this.name)
  }
}

/**
 * Create a `CacheStore` with the given name. If IndexedDB is available,
 * IndexedDB will be used. Otherwise, localStorage will be used.
 */
export function createCacheStore(name: string): CacheStore {
  return window.indexedDB
    ? new IndexedCacheStore(name)
    : new LocalStorageCacheStore(name)
}
