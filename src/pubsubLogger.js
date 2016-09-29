'use strict'

const R = require('ramda')
const { pubsubLogger, LOGGER_EVENT_BASE } = require('./config')

module.exports = (logger) => {
  const id = logger.id
  const ps = logger.pubsub





  const decorate = function (fn, event) {
    return (...args) => {
      const data = {
        id,
        event,
        args
      }
      // pubsubLogger(fn)
      // pubsubLogger(name)
      // pubsubLogger(args)
      logger.emit(LOGGER_EVENT_BASE, data)
      return fn.apply(null, args)
    }
  }


  ps.subscribe = decorate(ps.subscribe, 'subscribe')
}
