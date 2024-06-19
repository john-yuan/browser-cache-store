# browser-cache-store

A simple cache store that using indexedDB (fallbacks to localStorage if indexedDB is not available).

This library provides the following features:

1. Each operation to the cache store must be atomic.
2. User can access the previous value before putting a new value.

Example:

```ts
import { createCacheStore } from 'browser-cache-store'

const store = createCacheStore('test_cache_store')

// put value
store
  .put('counter', (prev) => {
    return (prev || 0) + 1
  })
  .then((res) => {
    console.log(res.prev)
    console.log(res.next)
  })

// get value
store.get('key').then((value) => {
  console.log(value)
})

// remove key
store.remove('key')

// remove all
store.clear()
```
