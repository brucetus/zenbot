var z = require('zero-fill')
, n = require('numbro')
, rsi = require('../../../lib/rsi')

module.exports = {
  name: 'pyramid',
  description: 'Attempts to buy by tracking RSI readings.',

  getOptions: function () {
    this.option('period_length', 'period length, same as --period', String, '2h')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell','sell', Boolean, false)
    this.option('rsi_periods', 'number of RSI periods', 14)
    this.option('oversold_rsi', 'buy when RSI reaches or drops below this value', Number, 55)
    this.option('overbought_rsi', 'sell when RSI reaches or goes above this value', Number, 45)
    this.option('rsi_recover', 'allow RSI to recover this many points before buying', Number, 1)
    this.option('rsi_drop', 'allow RSI to fall this many points before selling', Number, 1)
  },

  calculate: function (s) {
    rsi(s, 'rsi', s.options.rsi_periods)
    if (typeof s.period.rsi == 'number') {
      if (s.period.rsi <= s.options.oversold_rsi) {
        s.rsi_low = s.period.rsi
        s.trend = 'oversold'
      }
      if (s.period.rsi >= s.options.overbought_rsi) {
        s.rsi_high = s.period.rsi
        s.trend = 'overbought'
      }
      if (s.options.buy !== false) {
        if (s.trend == 'oversold') {
          s.rsi_low = Math.min(s.rsi_low, s.period.rsi)
          if (s.period.rsi >= s.rsi_low + s.options.rsi_recover) {
            s.trend = 'long'
            s.signal = 'buy'
            s.rsi_high = s.period.rsi
          }
        }
      }
      if (s.options.sell !== false) {
        if (s.trend == 'overbought') {
          s.rsi_high = Math.max(s.rsi_high, s.period.rsi)
          if (s.period.rsi <= s.rsi_high - s.options.rsi_drop) {
            s.trend = 'short'
            s.signal = 'sell'
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
    if (typeof s.period.rsi == 'number') {
      var color = 'grey'
      cols.push(z(4, n(s.period.rsi).format('0'), ' ')[color])
    }
    return cols
  }
}
