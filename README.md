# libp2p pubsub testnet logger

A test data logger for benchmarking libp2p pubsub implementations.

## Install

To install through npm:

```
```sh
> npm i libp2p-pstn-logger --save
```

## Example

`libp2p-pstn-logger` is built to work with [this early implementation of libp2p pubsub](https://github.com/libp2p/js-libp2p-floodsub). It simply decorates the Pubsub instance with new test log events necessary for the testnet benchmark tools.

```JavaScript
const Pubsub = require('libp2p-floodsub')
const libp2p = require('libp2p-ipfs')

const p2pInstance = new libp2p.Node(<somePeerInfo>)
const pubsub = PS(p2pInstance)

// decorate the pubsub instance...
// Note: pubsub is decorated with a .test property (a Nodejs EventEmitter)
addTestLog(pubsub, testNode.peerInfo.id.toB58String())

// Now you can listen to any of the following...
pubsub.test.on('subscribe', yourHandler)
pubsub.test.on('unsubscribe', yourHandler)
pubsub.test.on('publish', yourHandler)
pubsub.test.on('receive', yourHandler)
```

#### Event types

The new `pubsub.test` emits the following events:
- publish
- subscribe
- unsubscribe
- receive

#### Event structure

Test log events are JSON objects structured as follows:

```JavaScript
{
  timestamp: <milliseconds>, // time of event capture in the pubsub instance
  source: <libp2p_peer_id_base58_string>, // E.g.: libp2pNode.peerInfo.id.toB58String()
  type: <string>, // publish, subscribe, unsubscribe, receive
  args: <args_array_for_the_log_event>
}
```

## API

### `pubsub.test.on('subscribe', <handler>)`

### `pubsub.test.on('unsubscribe', <handler>)`

### `pubsub.test.on('publish', <handler>)`

### `pubsub.test.on('receive', <handler>)`

## Tests

To run the tests:

`> npm test`

## Contribute

PRs are welcome!

## License

MIT © Gavin McDermott
