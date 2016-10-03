'use strict'

const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const EE = require('events').EventEmitter
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')

const keys = require('./fixtures/keys').keys
const addLogger = require('./../src')
const { PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT } = require('./../src/config')

const NUM_NODES = 1

const testLogPath = path.join(__dirname, '/test-log/pstn.log')

const mapIndexed = R.addIndex(R.map)

const noop = () => {}

describe('Logger:', () => {
  let nodeA
  let nodeAid
  let loggerA
  let pubsubA

  let nodes = []
  let pubsubs = []
  let loggers = []

  const topicA = 'Topic A'

  const validNode = new TestNode({ id: keys[0], portOffset: 0 })

  const nodeCount = R.range(0, NUM_NODES)

  before((done) => {
    const startFns = mapIndexed((n, idx) => {
      let testNode = new TestNode({ id: keys[idx], portOffset: idx })
      nodes.push(testNode)

      let pubsub = PS(testNode.libp2p)
      pubsubs.push(pubsub)

      let logger = addLogger(pubsub, testNode.peerInfo.id.toB58String())
      loggers.push(logger)

      return testNode.start()
    }, nodeCount)

    nodeA = R.head(nodes)
    pubsubA = R.head(pubsubs)
    loggerA = R.head(loggers)

    nodeAid = nodeA.peerInfo.id.toB58String()

    Promise.all(startFns).then(() => setTimeout(done, 1000))
  })

  after((done) => {
    const stopFns = R.map((node) => {
      return node.libp2p.stop()
    }, nodes)

    Promise.all(stopFns).then(() => setTimeout(done, 1000))
  })

  describe('events:', () => {
    describe(`${SUBSCRIBE_EVENT}:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(SUBSCRIBE_EVENT)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(SUBSCRIBE_EVENT, validateEvent)
        expect(counter).to.equal(0)

        pubsubA.subscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(SUBSCRIBE_EVENT, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`${PUBLISH_EVENT}:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type

          if (type !== PUBLISH_EVENT) return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(PUBLISH_EVENT)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(PUBLISH_EVENT, validateEvent)

        expect(counter).to.equal(0)

        pubsubA.publish(topicA, new Buffer('Hey!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(PUBLISH_EVENT, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`${RECEIVE_EVENT}:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type

          if (type !== RECEIVE_EVENT) return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(RECEIVE_EVENT)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(RECEIVE_EVENT, validateEvent)
        expect(counter).to.equal(0)

        pubsubA.publish(topicA, new Buffer('Hi!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(RECEIVE_EVENT, validateEvent)
          done()
        }, 500)
      })
    })

    describe(`${UNSUBSCRIBE_EVENT}:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(UNSUBSCRIBE_EVENT)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        expect(counter).to.equal(0)
        loggerA.on(UNSUBSCRIBE_EVENT, validateEvent)

        pubsubA.unsubscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(UNSUBSCRIBE_EVENT, validateEvent)
          done()
        }, 100)
      })
    })
  })
})
