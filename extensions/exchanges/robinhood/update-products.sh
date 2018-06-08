#!/usr/bin/env node
let robinhood = require('robinhood')

var credentials = {
  username: conf.robinhood.key,
  password: conf.robinhood.secret
}

var Robinhood = require('robinhood')(credentials, function(){

  Robinhood.instruments(function(err, response, body){
    if (err) {
      console.error(err);
    } else {
      var products = []

      markets.forEach(function (market) {

        products.push({
          id: market.symbol,
          asset: market.symbol,
          currency: 'USD',
          min_size: 0,
          max_size: 99999999,
          increment: market.min_tick_size,
          asset_increment: 0,
          label: market.symbol + '/' + 'USD'
        })

      })

      var target = require('path').resolve(__dirname, 'products.json')
      require('fs').writeFileSync(target, JSON.stringify(products, null, 2))
      console.log('wrote', target)
      process.exit()
    }
  })
