'use strict'

const findRemarks = require('./find-remarks')

// todo: c.conSubscr
// todo: c.trfRes x vbb-parse-ticket
// todo: c.sotRating, c.isSotCon, c.sotCtxt
// todo: c.showARSLink
// todo: c.useableTime
// todo: c.cksum
// todo: c.isNotRdbl
// todo: c.badSecRefX
// todo: c.bfATS, c.bfIOSTS
const parseJourney = (ctx, j) => { // j = raw jouney
	const {profile, opt} = ctx

	const legs = j.secL.map(l => profile.parseJourneyLeg(ctx, l, j.date))
	const res = {
		type: 'journey',
		legs,
		refreshToken: j.ctxRecon || null
	}

	const freq = j.freq || {}
	if (freq.minC || freq.maxC) {
		res.cycle = {}
		if (freq.minC) res.cycle.min = freq.minC * 60
		if (freq.maxC) res.cycle.max = freq.maxC * 60
		// nr of connections in this frequency, from now on
		if (freq.numC) res.cycle.nr = freq.numC
	}

	if (opt.remarks && Array.isArray(j.msgL)) {
		res.remarks = findRemarks(j.msgL).map(([remark]) => remark)
	}

	if (opt.scheduledDays) {
		const year = parseInt(j.date.slice(0, 4))
		res.scheduledDays = profile.parseScheduledDays(ctx, j.sDays.sDaysB, year)
	}

	return res
}

module.exports = parseJourney
