'use strict'

const R = require('ramda')
const EE = require('events').EventEmitter
const TestNode = require('libp2p-pstn-node')

const { log, PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT } = require('./config')
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

  if (R.hasIn('testEvents', pubsub)) {
    throw new LoggerError('pubsub.testEvents exists')
  }

  pubsub.test = new EE()
  pubsub.testEvents = [ PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT ]

  // Note: 'emit' is currently pubsub's receive event - the pubsub event emitter is
  // called when a message is received for a topic the pubsub node is interested in
  const pubsubProxies = ['publish', 'subscribe', 'unsubscribe', 'emit']

  // TODO: potentially modify pubsub interface to give the logger some
  // better access to events/streams to and from a pubsub...this seems hacky
  const proxyMap = R.map((fnName) => {
    const fn = fnName
    let type
    switch (fnName) {
      case 'publish':
        type = PUBLISH_EVENT
        break
      // Note:
      // 'emit' events from the pubsub's EventEmitter are treated as
      // new messages received by the pubsub for some topic
      case 'emit':
        type = RECEIVE_EVENT
        break
      case 'subscribe':
        type = SUBSCRIBE_EVENT
        break
      case 'unsubscribe':
        type = UNSUBSCRIBE_EVENT
        break
      default:
        throw new LoggerError(`Unrecognized function to proxy: ${fnName}`)
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
      pubsub.test.emit(type, data)
      return fn.apply(pubsub, args)
    }
  }

  const decoratePubsub = (proxies) => {
    R.forEach((proxy) => pubsub[proxy.fn] = decorate(pubsub[proxy.fn], proxy.type), proxies)
  }

  decoratePubsub(proxyMap)
}
