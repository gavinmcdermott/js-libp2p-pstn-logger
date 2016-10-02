'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
// const parallel = require('run-parallel')

const keys = require('./fixtures/keys').keys
const addTestLog = require('./../src')
const { LOGGER_EVENT } = require('./../src/config')

const NUM_NODES = 1

const mapIndexed = R.addIndex(R.map)

const noop = () => {}

describe('Pubsub.test:', () => {
  let nodeA
  let nodeAid
  let pubsubA

  let nodes = []
  let pubsubs = []

  const topicA = 'Topic A'

  const validNode = new TestNode({ id: keys[0], portOffset: 0 })

  const nodeCount = R.range(0, NUM_NODES)

  before((done) => {
    const startFns = mapIndexed((n, idx) => {
      let testNode = new TestNode({ id: keys[idx], portOffset: idx })
      nodes.push(testNode)

      let pubsub = PS(testNode.libp2p)
      addTestLog(pubsub, testNode.peerInfo.id.toB58String())
      pubsubs.push(pubsub)

      return testNode.start()
    }, nodeCount)

    nodeA = R.head(nodes)
    pubsubA = R.head(pubsubs)
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
    describe(`subscribe:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal('subscribe')
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        pubsubA.test.on(LOGGER_EVENT, validateEvent)
        expect(counter).to.equal(0)

        pubsubA.subscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          pubsubA.test.removeListener(LOGGER_EVENT, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`publish:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type

          if (type !== 'publish') return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(`publish`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        pubsubA.test.on(LOGGER_EVENT, validateEvent)

        expect(counter).to.equal(0)

        pubsubA.publish(topicA, new Buffer('Hey!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          pubsubA.test.removeListener(LOGGER_EVENT, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`receive:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type

          if (type !== 'receive') return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(`receive`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        pubsubA.test.on(LOGGER_EVENT, validateEvent)
        expect(counter).to.equal(0)

        pubsubA.publish(topicA, new Buffer('Hi!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          pubsubA.test.removeListener(LOGGER_EVENT, validateEvent)
          done()
        }, 500)
      })
    })

    describe(`unsubscribe:`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(`unsubscribe`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        expect(counter).to.equal(0)
        pubsubA.test.on(LOGGER_EVENT, validateEvent)

        pubsubA.unsubscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          pubsubA.test.removeListener(LOGGER_EVENT, validateEvent)
          done()
        }, 100)
      })
    })
  })
})
