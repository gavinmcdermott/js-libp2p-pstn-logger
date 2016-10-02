'use strict'

const R = require('ramda')
const { LOGGER_EVENT } = require('./config')
const { LoggerError } = require('./errors')

module.exports = (logger) => {
  const ps = logger.pubsub

  const relevantPubsubFns = ['publish', 'subscribe', 'unsubscribe']
  const relevantEmitterFns = ['emit']
  const allRelevantFns = R.concat(relevantPubsubFns, relevantEmitterFns)

  const decorators = R.map((fnName) => {
    const name = fnName

    // 'emit' events from the pubsub's EventEmitter is treated as a new
    // message received for that node for some topic
    // TODO: potentially modify pubsub interface to give the logger some
    // better access to events/streams to and from a pubsub...this seems hacky
    let type = fnName
    if (fnName === 'emit') {
      type = 'receive'
    }

    return { name, type }
  }, allRelevantFns)

  const decorate = function (fn, type) {
    if (typeof fn !== 'function') throw new LoggerError('expect <fn> to be a function')
    return (...args) => {
      const data = {
        loggerId: logger.peerInfo.id.toB58String(),
        timestamp: Date.now(),
        type,
        args
      }
      logger.log(`${data.id}: ${type} event at ${data.timestamp} with ${args}`)
      logger.emit(LOGGER_EVENT, data)
      return fn.apply(ps, args)
    }
  }

  const decorateAll = (fnDecorators) => {
    R.forEach((fn) => ps[fn.name] = decorate(ps[fn.name], fn.type), fnDecorators)
  }

  decorateAll(decorators)
}
