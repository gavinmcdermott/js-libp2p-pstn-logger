'use strict'

const expect = require('chai').expect
const EE = require('events').EventEmitter
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src')
const R = require('ramda')
const libp2p = require('libp2p-ipfs')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const keys = require('./fixtures/keys').keys
const addLogger = require('./../src')
const { PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT } = require('./../src/config')

const NUM_NODES = 1

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

  const nodeCount = R.range(0, NUM_NODES)

  before((done) => {
    const startFns = mapIndexed((n, idx) => {
      let privKey = keys[idx].privKey

      // Peer info
      let peerId = PeerId.createFromPrivKey(privKey)
      let peerInstance = new PeerInfo(peerId)
      let peerAddr1 = multiaddr(`/ip4/127.0.0.1/tcp/${12000+idx}/ipfs/${peerInstance.id.toB58String()}`)
      peerInstance.multiaddr.add(peerAddr1)

      // Libp2p info
      let libp2pInstance = new libp2p.Node(peerInstance)

      // The network node instance
      let testNode = {
        peerInfo: peerInstance,
        libp2p: libp2pInstance,
      }
      nodes.push(testNode)

      let pubsub = PS(testNode.libp2p)
      pubsubs.push(pubsub)

      let logger = addLogger(pubsub, testNode.peerInfo.id.toB58String())
      loggers.push(logger)

      return testNode.libp2p.start(noop)
    }, nodeCount)

    nodeA = R.head(nodes)
    pubsubA = R.head(pubsubs)
    loggerA = R.head(loggers)

    nodeAid = nodeA.peerInfo.id.toB58String()

    Promise.all(startFns).then(() => {
      // pubsubA.subscribe(topicA)
      setTimeout(done, 1000)
    })
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

        pubsubA.publish(topicA, 'Hey!')

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

        pubsubA.publish(topicA, 'Hi!')

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
