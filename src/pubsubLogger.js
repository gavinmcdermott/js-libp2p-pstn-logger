'use strict'

const R = require('ramda')
const { pubsubLogger, LOGGER_EVENT_BASE } = require('./config')

module.exports = (logger) => {
  const ps = logger.pubsub

  const decorate = function (fn, event) {
    return (...args) => {
      const data = {
        loggerId: logger.id,
        timestamp: Date.now(),
        event,
        args
      }
      // console.log('')
      // console.log(event, 'log at:', data.timestamp ,'with:', args)
      // console.log('')
      logger.emit(LOGGER_EVENT_BASE, data)
      return fn.apply(null, args)
    }
  }

  ps.subscribe = decorate(ps.subscribe, 'subscribe')
  ps.publish = decorate(ps.publish, 'publish')
}
