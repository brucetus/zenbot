var z = require('zero-fill'),
n = require('numbro'),
highest = require('../../../lib/highest'),
lowest = require('../../../lib/lowest'),
dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'pivot',
  description: 'Pivot Reversal Strategy',

  getOptions: function () {
    this.option('period_length', 'period length', String, '4h')
    this.option('min_periods', 'min periods', Number, 50)
    this.option('up', 'up', Number, 1)
    this.option('down','down', Number, 1)
  },

  calculate: function (s) {
    if (s.lookback[s.options.min_periods]) {
      if (s.period.high / s.pivothigh > s.options.up) {
        if (s.trend !== 'up') {
          s.acted_on_trend = false
        }
        s.trend = 'up'
        if (dupOrderWorkAround.checkForPriorBuy(s))
        s.signal = !s.acted_on_trend ? 'buy' : null
      }
      if (s.period.low / s.pivotlow < s.options.down) {
        if (s.trend !== 'down') {
          s.acted_on_trend = false
        }
        s.trend = 'down'
        if (dupOrderWorkAround.checkForPriorSell(s))
        s.signal = !s.acted_on_trend ? 'sell' : null
      }
    }
  },

  onPeriod: function (s, cb) {
    if (s.lookback[s.options.min_periods]) {
      if (s.lookback[5].high <= s.lookback[1].high && s.lookback[4].high <= s.lookback[1].high && s.lookback[3].high <= s.lookback[1].high && s.lookback[2].high <= s.lookback[1].high && s.lookback[0].high <= s.lookback[1].high && s.period.high <= s.lookback[1].high) {
        s.pivothigh = s.lookback[1].high
      }
      if (s.lookback[5].low >= s.lookback[1].low && s.lookback[4].low >= s.lookback[1].low && s.lookback[3].low >= s.lookback[1].low && s.lookback[2].low >= s.lookback[1].low && s.lookback[0].low >= s.lookback[1].low && s.period.low >= s.lookback[1].low) {
        s.pivotlow = s.lookback[1].low
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (s.lookback[s.options.min_periods]) {
      cols.push(z(8, n(s.pivothigh), ' '))
      cols.push(z(1, ' '))
      cols.push(z(8, n(s.pivotlow), ' '))
    }
    return cols
  }
}
