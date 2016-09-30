'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
const parallel = require('run-parallel')

const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')

const mapIndexed = R.addIndex(R.map)

describe('Logger', () => {
  describe('constructor', () => {
    const validNode = new TestNode({ id: keys[0], portOffset: 0 })

    it('fails: missing Node', () => {
      const thrower = () => new Logger()
      expect(thrower).to.throw
    })

    it('fails: invalid Node', () => {
      const thrower = () => new Logger({})
      expect(thrower).to.throw
    })

    it('fails: missing pubsub', () => {
      const thrower = () => new Logger(validNode)
      expect(thrower).to.throw
    })

    it('success', () => {
      const logger = new Logger(validNode, PS)
      expect(logger instanceof Logger).to.be.true
      expect(logger.node instanceof TestNode).to.be.true
      expect(logger.pubsub instanceof PS).to.be.true
    })
  })

  describe('one node', () => {
    let loggerA
    let loggers = R.range(0, 1)

    const topicA = 'AAA'

    before(() => {
      const startFns = mapIndexed((n, idx) => {
        let node = new TestNode({ id: keys[idx], portOffset: idx })
        loggers[idx] = new Logger(node, PS)
        return node.start
      }, loggers)

      loggerA = loggers[0]

      return Promise.all(startFns)
    })

    after(() => {
      const stopFns = R.map((logger) => {
        return logger.node.libp2p.stop
      },loggers)
      return Promise.all(stopFns)
    })

    describe('emit', () => {
      it('"subscribe" events', () => {
        let counter = 0

        loggerA.on('data', (data) => {
          const loggerId = data.loggerId
          const event = data.event
          const topic = data.args[0]

          expect(R.equals(loggerId, loggerA.id)).to.be.true
          expect(R.equals(event, 'subscribe')).to.be.true
          expect(R.equals(topic, topicA)).to.be.true

          counter++
        })

        expect(counter).to.equal(0)

        loggerA.pubsub.subscribe(topicA)

        expect(counter).to.equal(1)
      })






    })
  })
})
