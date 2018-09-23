var z = require('zero-fill')
, n = require('numbro')
, srsi = require('../../../lib/srsi')

module.exports = {
  name: 'srsi',
  description: 'Creates pyramid orders using SRSI.',

  getOptions: function () {
    this.option('period_length', 'period length', String, '2h')
    this.option('min_periods', 'min. number of history periods', Number, 14)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell','sell', Boolean, false)
    this.option('srsi_periods', 'number of srsi periods', 14)
    this.option('srsi_k', '%D line', Number, 3)
    this.option('srsi_d', '%D line', Number, 3)
    this.option('oversold_srsi', 'buy when srsi reaches or drops below this value', Number, 5)
    this.option('overbought_srsi', 'sell when srsi reaches or goes above this value', Number, 95)
    this.option('srsi_recover', 'allow srsi to recover this many points before buying', Number, 1)
  },

  calculate: function (s) {
    srsi(s, 'srsi', s.options.srsi_periods, s.options.srsi_k, s.options.srsi_d)
    if (typeof s.period.srsi_K === 'number') {
      if (s.period.srsi_K <= s.options.oversold_srsi) {
        s.srsi_low = s.period.srsi_K
        s.trend = 'oversold'
      }
      if (s.period.srsi_K >= s.options.overbought_srsi) {
        s.srsi_high = s.period.srsi_K
        s.trend = 'overbought'
      }
      if (s.options.buy !== false) {
        if (s.trend == 'oversold') {
          s.srsi_low = Math.min(s.srsi_low, s.period.srsi_K)
          if (s.period.srsi_K >= s.srsi_low + s.options.srsi_recover) {
            s.trend = 'long'
            s.signal = 'buy'
            s.srsi_high = s.period.srsi_K
          }
        }
      }
      if (s.options.sell !== false) {
        if (s.trend == 'overbought') {
          s.srsi_high = Math.max(s.srsi_high, s.period.srsi_K)
          if (s.period.srsi_K <= s.srsi_high - s.options.srsi_recover) {
            s.trend = 'short'
            s.signal = 'sell'
            s.srsi_low = s.period.srsi_K
          }
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
    if (typeof s.period.srsi_K == 'number') {
      var color = 'grey'
      cols.push(z(4, n(s.period.srsi_K).format('0'), ' ')[color])
    }
    return cols
  }
}
