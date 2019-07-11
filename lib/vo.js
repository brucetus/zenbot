module.exports = function vo (s, key, short, long, source_key) {
  if (!source_key) source_key = 'volume'
  if (s.lookback.length >= short) {
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

    s.period[key] = 100 * (shortV/short - longV/long) / (longV/long)
  }
}
