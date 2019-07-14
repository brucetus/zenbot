module.exports = function vo_ema (s, key, short, long, source_key) {
  if (!source_key) source_key = 'volume'
  if (s.lookback.length >= short) {
    var prev_vo = s.lookback[0][key]
    if (typeof prev_vo === 'undefined' || isNaN(prev_vo)) {
      let shortV = s.lookback
      .slice(0, short)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      let longV = s.lookback
      .slice(0, long)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      prev_vo = 100 * (shortV/short - longV/long) / (longV/long)
    }
      var multiplier = 2 / (length + 1)
      s.period[key] = (s.period[source_key] - prev_vo) * multiplier + prev_vo
    }
  }
