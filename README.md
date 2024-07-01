# browser-cache-store

[![npm version](https://img.shields.io/npm/v/browser-cache-store.svg)](https://www.npmjs.com/package/browser-cache-store)
[![install size](https://packagephobia.now.sh/badge?p=browser-cache-store)](https://packagephobia.now.sh/result?p=browser-cache-store)
[![npm downloads](https://img.shields.io/npm/dm/browser-cache-store.svg)](http://npm-stat.com/charts.html?package=browser-cache-store)

A simple cache store that uses IndexedDB (falls back to localStorage if IndexedDB is not available).

This library offers the following features:

1. Every operation on the cache store is atomic.
2. Users can retrieve the previous value associated with a key and replace it with a new value in a single atomic operation.

Installation:

```sh
npm i browser-cache-store
```

Examples:

```ts
import { createCacheStore } from 'browser-cache-store'

const store = createCacheStore('the_store_name')

// put value
store
  .put('counter', (prev) => (prev || 0) + 1)
  .then((res) => {
    console.log(res.prev)
    console.log(res.next)
  })

// set value
store.set('key', 'value').then(() => {
  console.log('set')
})

// get value
store.get('key').then((value) => {
  console.log(value)
})

// remove key
store.remove('key').then(() => {
  console.log('removed')
})

// remove all
store.clear().then(() => {
  console.log('cleared')
})
```
