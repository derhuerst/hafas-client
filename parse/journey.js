'use strict'

const {DateTime} = require('luxon')
const findRemarks = require('./find-remarks')

const parseScheduledDays = (sDaysB, year, profile) => {
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

// todo: c.conSubscr
// todo: c.trfRes x vbb-parse-ticket
// todo: c.sotRating, c.isSotCon, c.sotCtxt
// todo: c.showARSLink
// todo: c.useableTime
// todo: c.cksum
// todo: c.isNotRdbl
// todo: c.badSecRefX
// todo: c.bfATS, c.bfIOSTS
// todo: https://gist.github.com/derhuerst/ca801d0d93bc4ff8276f9c760b3240b4#file-subscription-journey-js-L3295-L3363
const parseJourney = (ctx, j) => { // j = raw jouney
	const {profile, opt} = ctx

	const legs = j.secL.map(l => profile.parseJourneyLeg(ctx, l, j.date))
	const res = {
		type: 'journey',
		legs,
		refreshToken: (j.recon && j.recon.ctx) || j.ctxRecon || null
	}

	const freq = j.freq || {}
	if (freq.minC || freq.maxC) {
		res.cycle = {}
		if (freq.minC) res.cycle.min = freq.minC * 60
		if (freq.maxC) res.cycle.max = freq.maxC * 60
		// nr of connections in this frequency, from now on
		if (freq.numC) res.cycle.nr = freq.numC
	}

	const msgL = (
		(Array.isArray(j.msgL) && j.msgL)
		|| (Array.isArray(j.messageList) && j.messageList)
		|| null
	)
	if (opt.remarks && msgL) {
		res.remarks = findRemarks(ctx, msgL).map(([remark]) => remark)
	}

	if (opt.scheduledDays) {
		const year = parseInt(j.date.slice(0, 4))
		res.scheduledDays = parseScheduledDays(j.sDays.sDaysB, year, profile)
	}

	return res
}

module.exports = parseJourney
