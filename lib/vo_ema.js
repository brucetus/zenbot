module.exports = function vo_ema (s, key, short, long, source_key) {
  if (s.lookback.length >= long) {
    if (typeof s.periodprev_long === 'undefined' || isNaN(prev_vo)) {
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
      let short_mult = 2 / (short + 1)
      let long_mult = 2 / (long + 1)
      let short_ema = (s.period.volume - s.period.prev_short) * short_mult + s.period.prev_short
      let long_ema = (s.period.volume - s.period.prev_long) * long_mult + s.period.prev_long
      s.period[key] = 100 * (short_ema - long_ema) / long_ema
    }
  }
