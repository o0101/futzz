
export const BigSet = class {
  /*
    public api, compatible with "Set"
  */

  constructor (...parameters) {
    this.sets = [new Set(...parameters)]
  }

  add (key) {
    const set = this.sets[this.sets.length - 1]

    if (set.size === kMaxSize) {
      this.sets.push(new Set())
      return this.add(key)
    } else {
      return set.add(key)
    }
  }

  has (key) {
    return _setForKey(this.sets, key) !== undefined
  }

  delete (key) {
    const set = _setForKey(this.sets, key)

    if (set !== undefined) {
      return set.delete(key)
    }

    return false
  }

  clear () {
    for (let set of this.sets) {
      set.clear()
    }
  }

  get size () {
    let size = 0

    for (let set of this.sets) {
      size += set.size
    }

    return size
  }

  forEach (callbackFn, thisArg) {
    if (thisArg) {
      for (let value of this) {
        callbackFn.call(thisArg, value)
      }
    } else {
      for (let value of this) {
        callbackFn(value)
      }
    }
  }

  entries () {
    return _iterator(this.sets, 'entries')
  }

  keys () {
    return _iterator(this.sets, 'keys')
  }

  values () {
    return _iterator(this.sets, 'values')
  }

  [Symbol.iterator] () {
    return _iterator(this.sets, Symbol.iterator)
  }
}

/*
  private function
*/

function _setForKey (sets, key) {
  for (let index = sets.length - 1; index >= 0; index--) {
    const set = sets[index]

    if (set.has(key)) {
      return set
    }
  }
}

function _iterator (items, name) {
  let index = 0

  var iterator = items[index][name]()

  return {
    next: () => {
      let result = iterator.next()

      if (result.done && index < (items.length - 1)) {
        index++
        iterator = items[index][name]()
        result = iterator.next()
      }

      return result
    },
    [Symbol.iterator]: function () {
      return this
    }
  }
}

BigSet.length = 0
