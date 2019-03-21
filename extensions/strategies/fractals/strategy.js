var z = require('zero-fill')
, n = require('numbro')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'fractals',
  description: 'Fractals',

  getOptions: function () {
    this.option('period_length', 'period length', String, '2h')
    this.option('min_periods', 'min_periods', Number, 20)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('up', 'up', Number, 1)
    this.option('down','down', Number, 1)
  },

  calculate: function (s) {
    if (s.upfractal || s.downfractal) {
      if (s.options.buy !== false) {
        if (s.period.high / s.upfractal > s.options.up) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          if (dupOrderWorkAround.checkForPriorBuy(s))
          s.signal = !s.acted_on_trend ? 'buy' : null
        }
      }
      if (s.options.sell !== false) {
        if (s.period.low / s.downfractal < s.options.down) {
          if (s.trend !== 'down') {
            s.acted_on_trend = false
          }
          s.trend = 'down'
          if (dupOrderWorkAround.checkForPriorSell(s))
          s.signal = !s.acted_on_trend ? 'sell' : null
        }
      }
    }
  },

  onPeriod: function (s, cb) {
    if (s.lookback[3]) {
      if (s.lookback[3].high <= s.lookback[1].high && s.lookback[2].high <= s.lookback[1].high && s.lookback[0].high <= s.lookback[1].high && s.period.high <= s.lookback[1].high) {
        s.upfractal = s.lookback[1].high
      }
      if (s.lookback[3].low >= s.lookback[1].low && s.lookback[2].low >= s.lookback[1].low && s.lookback[0].low >= s.lookback[1].low && s.period.low >= s.lookback[1].low) {
        s.downfractal = s.lookback[1].low
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    cols.push(z(8, n(s.upfractal), ' ').green)
    cols.push(z(1, ' '))
    cols.push(z(8, n(s.downfractal), ' ').red)
    return cols
  }
}
