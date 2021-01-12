'use strict'

// todo: get the original parseWhen differently
const _parseWhen = require('../parse/when')

const parseWhen = (ctx, date, rtDate, time, rtTime, tzOffset, cncl = false) => {
	// todo: compute `rtTime` offset using `rtDate`
	date = rtDate || date
	if (date) date = date.replace(/-/g, '')
	if (time) time = time.replace(/:/g, '')
	if (rtTime) rtTime = rtTime.replace(/:/g, '')
	return _parseWhen(ctx, date, time, rtTime, tzOffset, cncl)
}

module.exports = parseWhen
