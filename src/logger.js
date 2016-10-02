'use strict'

const R = require('ramda')
const util = require('util')
const EE = require('events').EventEmitter
const TestNode = require('libp2p-pstn-node')

const { log, LOGGER_EVENT } = require('./config')
const { LoggerError } = require('./errors')

module.exports = (pubsub, id) => {
  if (R.isNil(pubsub)) {
    throw new LoggerError('Missing pubsub')
  }

  if (R.isNil(id)) {
    throw new LoggerError('Missing id')
  }

  if (R.hasIn('test', pubsub)) {
    throw new LoggerError('pubsub.test exists')
  }

  pubsub.test = new EE()

  // Note: 'emit' is currently pubsub's receive event
  const pubsubProxies = ['publish', 'subscribe', 'unsubscribe', 'emit']

  const proxyMap = R.map((fnName) => {
    const fn = fnName

    // 'emit' events from the pubsub's EventEmitter is treated as a new
    // message received for that node for some topic
    // TODO: potentially modify pubsub interface to give the logger some
    // better access to events/streams to and from a pubsub...this seems hacky
    let type = fnName
    if (fnName === 'emit') {
      type = 'receive'
    }

    return { fn, type }
  }, pubsubProxies)

  const decorate = function (fn, type) {
    if (typeof fn !== 'function') throw new LoggerError('expect <fn> to be a function')
    return (...args) => {
      const data = {
        timestamp: Date.now(),
        source: id,
        type,
        args
      }
      log(`${data.id}: ${type} event at ${data.timestamp} with ${args}`)
      pubsub.test.emit(LOGGER_EVENT, data)
      return fn.apply(pubsub, args)
    }
  }

  const decoratePubsub = (proxies) => {
    R.forEach((proxy) => pubsub[proxy.fn] = decorate(pubsub[proxy.fn], proxy.type), proxies)
  }

  decoratePubsub(proxyMap)
}
