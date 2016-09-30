'use strict'

const R = require('ramda')
const { pubsubLogger, MAIN_LOGGER_EVENT_TYPE, PS_LOGGER_EVENT_BASE } = require('./config')
const { LoggerError } = require('./errors')

module.exports = (logger) => {
  const ps = logger.pubsub

  const relevantLoggerFns = [/*'publish',*/ 'subscribe', 'unsubscribe']
  const relevantEventEmitterFns = ['emit']
  const allRelevantFns = R.concat(relevantLoggerFns, relevantEventEmitterFns)

  const decorate = function (fn, type) {
    if (typeof fn !== 'function') throw new LoggerError('expect <fn> to be a function')
    return (...args) => {
      const data = {
        id: logger.peerInfo.id.toB58String(),
        timestamp: Date.now(),
        type,
        args
      }
      pubsubLogger(`${data.id}: ${type} event at ${data.timestamp} with ${args}`)
      logger.emit(MAIN_LOGGER_EVENT_TYPE, data)
      return fn.apply(ps, args)
    }
  }

  const decorateAll = (fns) => {
    R.forEach((fnName) => {
      ps[fnName] = decorate(ps[fnName], `${PS_LOGGER_EVENT_BASE}${fnName}`)
    }, fns)
  }

  decorateAll(allRelevantFns)
}
