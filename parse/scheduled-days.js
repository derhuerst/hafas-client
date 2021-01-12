'use strict'

const {DateTime} = require('luxon')

const parseScheduledDays = (ctx, sDaysB, year) => {
	const {profile} = ctx

	sDaysB = Buffer.from(sDaysB, 'hex')
	const res = Object.create(null)

	let d = DateTime.fromObject({
		zone: profile.timezone, locale: profile.locale,
		year, // Expected to be in the correct tz offset!
		month: 1, day: 1,
		hour: 0, minute: 0, second: 0, millisecond: 0
	})
	for (let b = 0; b < sDaysB.length; b++) {
		for (let i = 0; i < 8; i++) {
			res[d.toISODate()] = (sDaysB[b] & Math.pow(2, 7 - i)) > 0
			d = d.plus({days: 1})
		}
	}
	return res
}

module.exports = parseScheduledDays
