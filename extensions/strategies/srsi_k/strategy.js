var z = require('zero-fill')
, n = require('numbro')
, srsi = require('../../../lib/srsi')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'srsi_k',
  description: 'Buys and sells when SRSI K hits oversold or overbought value.',

  getOptions: function () {
    this.option('period_length', 'period length', String, '4h')
    this.option('min_periods', 'min. number of history periods', Number, 14)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('rsi_periods', 'number of srsi periods', Number, 14)
    this.option('srsi_k', '%D line', Number, 3)
    this.option('srsi_d', '%D line', Number, 3)
    this.option('oversold_srsi', 'buy when srsi reaches or drops below this value', Number, 5)
    this.option('overbought_srsi', 'sell when srsi reaches or goes above this value', Number, 95)
  },

  calculate: function (s) {
    srsi(s, 'srsi', s.options.rsi_periods, s.options.srsi_k, s.options.srsi_d)
    if (typeof s.period.srsi_K === 'number') {
      if (s.options.buy !== false) {
        if (s.period.srsi_K < s.options.oversold_srsi) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          if (dupOrderWorkAround.checkForPriorBuy(s))
          s.signal = !s.acted_on_trend ? 'buy' : null
        }
      }
      if (s.options.sell !== false) {
        if (s.period.srsi_K > s.options.overbought_srsi) {
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
    if (s.in_preroll) return cb()
    cb()
  },

  onReport: function (s) {
    var cols = []
    cols.push(z(8, n(s.period.srsi_K).format('0'), ' ').cyan)
    return cols
  }
}
