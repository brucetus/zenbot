const ccxt = require('ccxt')
, path = require('path')
, minimist = require('minimist')
, colors = require('colors')
, _ = require('lodash')

module.exports = function kraken (conf) {
  var s = {
    options: minimist(process.argv)
  }
  var so = s.options
  var public_client, authed_client
  let firstRun = true
  let allowGetMarketCall = true

  function publicClient () {
    if (!public_client) public_client = new ccxt.kraken({ 'apiKey': '', 'secret': '' })
    return public_client
  }

  function authedClient () {
    if (!authed_client) {
      if (!conf.kraken || !conf.kraken.key || conf.kraken.key === 'YOUR-API-KEY') {
        throw new Error('please configure your Kraken credentials in ' + path.resolve(__dirname, 'conf.js'))
      }
      authed_client = new ccxt.kraken({ 'apiKey': conf.kraken.key, 'secret': conf.kraken.secret })
    }
    return authed_client
  }

  function joinProduct(product_id) {
    let split = product_id.split('-')
    return split[0] + '/' + split[1]
  }

  function retry (method, args, err) {
    if (method !== 'getTrades') {
      console.error(('\nKraken API is down! unable to call ' + method + ', retrying in 30s').red)
      if (err) console.error(err)
      console.error(args.slice(0, -1))
    }
    setTimeout(function () {
      exchange[method].apply(exchange, args)
    }, 30000)
  }

  var orders = {}

  var exchange = {
    name: 'krakenccxt',
    historyScan: 'forward',
    historyScanUsesTime: true,
    makerFee: 0.16,
    takerFee: 0.26,
    backfillRateLimit: 5000,

    getProducts: function () {
      return require('./products.json')
    },

    getTrades: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      , trades = []
      , maxTime = 0
      var client = publicClient()
      var args = {}
      if (opts.from) {
        args.since = Number(opts.from) * 1000000
      }
      if (allowGetMarketCall != true) {
        cb(null, [])
        return null
      }
      if (firstRun) {
        client.fetchOHLCV(joinProduct(opts.product_id), '120', args.since).then(result => {
          var lastVal = 0
          trades = result.map(function(trade) {
            let buySell = parseFloat(trade[4]) > lastVal ? 'buy' : 'sell'
            lastVal = parseFloat(trade[4])
            if (Number(trade[0]) > maxTime) maxTime = Number(trade[0])
            return {
              trade_id: trade[0]+''+ (trade[5]+'').slice(-2) + (trade[4]+'').slice(-2),
              time: trade[0],
              size: parseFloat(trade[6]),
              price: parseFloat(trade[4]),
              side: buySell
            }
          })
          cb(null, trades)
        }).catch(function(error) {
          firstRun = false
          allowGetMarketCall = false
          setTimeout(()=>{allowGetMarketCall = true}, 5000)
          console.error('[OHLCV] An error occurred', error)
          return retry('getTrades', func_args, error)
        })
      }
      else {
        client.fetchTrades(joinProduct(opts.product_id), args.since).then(result => {
          var trades = result.map(function (trade) {
            return {
              trade_id: trade[2] + trade[1] + trade[0],
              time: moment.unix(trade[2]).valueOf(),
              size: parseFloat(trade[1]),
              price: parseFloat(trade[0]),
              side: trade[3] == 'b' ? 'buy' : 'sell'
            }
          })
          cb(null, trades)
        }).catch(function (error) {
          console.error('An error occurred', error)
          return retry('getTrades', func_args)
        })
      }
    },

    getBalance: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (!so.leverage) {
        client.fetchBalance().then(result => {
          var balance = {asset: 0, currency: 0}
          Object.keys(result).forEach(function (key) {
            if (key === opts.currency) {
              balance.currency = result[key].free + result[key].used
              balance.currency_hold = result[key].used
            }
            if (key === opts.asset) {
              balance.asset = result[key].free + result[key].used
              balance.asset_hold = result[key].used
            }
          })
          cb(null, balance)
        })
        .catch(function (error) {
          console.error('An error occurred', error)
          return retry('getBalance', func_args)
        })
      } else if (so.leverage > 1) {
        var balance = {
          asset: '100',
          asset_hold: '0',
          currency: '100',
          currency_hold: '0'
        }
        cb(null, balance)
      }
    },

    getQuote: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      client.fetchTicker(joinProduct(opts.product_id)).then(result => {
        cb(null, { bid: result.bid, ask: result.ask })
      })
      .catch(function (error) {
        console.error('An error occurred', error)
        return retry('getQuote', func_args)
      })
    },

    getDepth: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      client.fetchOrderBook(joinProduct(opts.product_id), {limit: opts.limit}).then(result => {
        cb(null, result)
      })
      .catch(function(error) {
        console.error('An error ocurred', error)
        return retry('getDepth', func_args)
      })
    },

    cancelOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.cancelOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        if (body && (body.status === 'closed' || body.status === 'canceled')) return cb()
        cb(null)
      }, function(err){
        if (err) {
          return retry('cancelOrder', func_args, err)
        }
        cb()
      })
    },

    buy: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      var args = {}
      if (opts.order_type === 'taker') {
        delete opts.price
        delete opts.post_only
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
      }
      opts.side = 'buy'
      delete opts.order_type
      if (so.leverage > 1) {
        args.leverage = so.leverage
      }
      var order = {}
      client.createOrder(joinProduct(opts.product_id), opts.type, opts.side, this.roundToNearest(opts.size, opts), opts.price, { 'leverage': args.leverage }).then(result => {
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: opts.price,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          ordertype: opts.order_type
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)
        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }

        return retry('buy', func_args)
      })
    },

    sell: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      var args = {}
      if (opts.order_type === 'taker') {
        delete opts.price
        delete opts.post_only
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
      }
      opts.side = 'sell'
      delete opts.order_type
      if (so.leverage > 1) {
        args.leverage = so.leverage
      }
      var order = {}
      client.createOrder(joinProduct(opts.product_id), opts.type, opts.side, this.roundToNearest(opts.size, opts), opts.price, { 'leverage': args.leverage }).then(result => {
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: opts.price,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          ordertype: opts.order_type
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)
        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }

        return retry('sell', func_args)
      })
    },

    roundToNearest: function(numToRound, opts) {
      var numToRoundTo = _.find(this.getProducts(), { 'asset': opts.product_id.split('-')[0], 'currency': opts.product_id.split('-')[1] }).min_size
      numToRoundTo = 1 / (numToRoundTo)

      return Math.floor(numToRound * numToRoundTo) / numToRoundTo
    },

    getOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      var order = orders['~' + opts.order_id]
      client.fetchOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        if (body.status !== 'open' && body.status !== 'canceled') {
          order.status = 'done'
          order.done_at = new Date().getTime()
          order.filled_size = parseFloat(body.vol_exec)
          return cb(null, order)
        }
        cb(null, order)
      }, function(err) {
        return retry('getOrder', func_args, err)
      })
    },

    getCursor: function (trade) {
      return (trade.time || trade)
    }
  }
  return exchange
}
