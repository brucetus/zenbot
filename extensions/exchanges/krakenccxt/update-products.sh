#!/usr/bin/env node
let ccxt = require('ccxt')

new ccxt.kraken().fetch_markets().then(function(markets) {
  var products = []

  markets.forEach(function (market) {
    products.push({
      id: market.id,
      asset: market.base,
      currency: market.quote,
      min_size: '0.01',
      max_size: '100000',
      increment: '0.01',
      label: market.base + '/' + market.quote
    })
  })

  var target = require('path').resolve(__dirname, 'products.json')
  require('fs').writeFileSync(target, JSON.stringify(products, null, 2))
  console.log('wrote', target)
  process.exit()
})
