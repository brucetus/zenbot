module.exports = function vo_ema (s, key, short, long, source_key) {
  if (s.lookback.length >= long) {
    if (typeof s.period.prev_long === 'undefined' || isNaN(s.period.prev_long)) {
      let shortV = s.lookback
      .slice(0, short - 1)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      let longV = s.lookback
      .slice(0, long - 1)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      s.period.prev_short = shortV/short
      s.period.prev_long = longV/short
    }
      var short_mult = 2 / (short + 1)
      var long_mult = 2 / (long + 1)
      var short_ema = (s.period.volume - s.period.prev_short) * short_mult + s.period.prev_short
      var long_ema = (s.period.volume - s.period.prev_long) * long_mult + s.period.prev_long
      s.period[key] = 100 * (short_ema - long_ema) / long_ema
    }
  }
