# js libp2p pstn logger

A test data logger for benchmarking libp2p pubsub implementations.

## Install

To install through npm:

```sh
> npm i libp2p-pstn-logger --save
```

## Example

`libp2p-pstn-logger` is built to work with [this early implementation of libp2p pubsub](https://github.com/libp2p/js-libp2p-floodsub). It simply proxies a Pubsub instance's function calls and adds the new log events necessary for the testnet benchmark tools.

It logs using [this debug module](https://github.com/visionmedia/debug) seen commonly in the `js-libp2p` ecosystem. 

```JavaScript
const Pubsub = require('libp2p-floodsub')
const libp2p = require('libp2p-ipfs')

const p2p = new libp2p.Node(<somePeerInfo>)
const pubsub = PS(p2p)

// If you want to work with a logger instance, simply create one.
// Otherwise it will proxy and log the important pubsub events

const logger = new Logger(pubsub, p2p.peerInfo.id.toB58String())
logger.on('publish', <your handler>)
```

### Proxied Pubsub Log Events

The proxied `pubsub` instance will now log the following events:

- `<timestamp> pstn:logger publish ...`
- `<timestamp> pstn:logger receive ...`
- `<timestamp> pstn:logger subscribe ...`
- `<timestamp> pstn:logger unsubscribe ...`

### Logger Instance Events

Logger instances will receive these events:

- `pubsub.test.on('publish', <handler>)`
- `pubsub.test.on('receive', <handler>)` 
- `pubsub.test.on('subscribe', <handler>)`
- `pubsub.test.on('unsubscribe', <handler>)`

### Logger Instance Event Structure

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

### Logger Instance

#### `logger.on('publish', <handler>)`

#### `logger.on('receive', <handler>)`

#### `logger.on('subscribe', <handler>)`

#### `logger.on('unsubscribe', <handler>)`

## Tests

To run the tests:

`> npm test`

## Contribute

PRs are welcome!

## License

MIT © Gavin McDermott
