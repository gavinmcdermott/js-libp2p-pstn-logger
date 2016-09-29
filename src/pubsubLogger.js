'use strict'

const R = require('ramda')
const { pubsubLogger } = require('./config')

const decorate = function (fn, name) {
  return (...fnArgs) => {
    // pubsubLogger(fn)
    // pubsubLogger(name)
    pubsubLogger(fnArgs)
    return fn.apply(null, fnArgs)
  }
}

module.exports = (Logger) => {
  const ps = Logger.pubsub

  ps.subscribe = decorate(ps.subscribe, 'subscribe')
}
