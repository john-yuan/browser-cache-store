export type CacheUpdated<T = any> = { prev?: T; next: T }
export type JSONDataObject = { data: Record<string, any> }

export interface CacheStore {
  put<T = any>(
    key: string,
    update: (prev: T | undefined) => T
  ): Promise<CacheUpdated<T>>
  get<T = any>(key: string): Promise<T | undefined>
  remove(key: string): Promise<void>
  clear(): Promise<void>
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
        resolve(req.result)
        this.db = req.result
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

  async get<T = any>(key: string) {
    return new Promise<T | undefined>((resolve, reject) => {
      this.store('readonly', reject, (store) => {
        const get = store.get(key)
        get.onerror = reject
        get.onsuccess = () => resolve(get.result)
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
    if (text) {
      const json = JSON.parse(text) as JSONDataObject
      if (json) {
        if (!json.data) {
          json.data = {}
        }
        return json
      }
    }
    return { data: {} }
  }

  private putJSON(json: JSONDataObject) {
    localStorage.setItem(this.name, JSON.stringify(json))
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

export function createCacheStore(name: string): CacheStore {
  return window.indexedDB
    ? new IndexedCacheStore(name)
    : new LocalStorageCacheStore(name)
}
