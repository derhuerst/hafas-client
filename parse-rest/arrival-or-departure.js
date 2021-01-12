'use strict'

// todo: d.JourneyStatus
// todo: d.prognosisType

const createParseArrOrDep = (type) => {
	const parseArrOrDep = (ctx, d) => {
		const {profile, opt} = ctx

		const product = {
			name: d.name,
			number: d.trainNumber,
			category: d.trainCategory,
			...d.Product
		}

		const res = {
			tripId: d.JourneyDetailRef && d.JourneyDetailRef.ref || null,
			stop: profile.parseLocation(ctx, {
				type: d.type,
				name: d.stop,
				id: d.stopid,
				extId: d.stopExtId
			}),
			line: profile.parseLine(ctx, product) || null,
			direction: type === 'departure' && d.direction || null, // todo: arrivals
			// todo: is there `d.rtDate` & `d.tz` & `d.rtTz`?
			...profile.parseWhen(ctx, d.date, null, d.time, d.rtTime, null, !!d.cancelled),
			// todo: use profile.parsePlatform
			platform: d.track || null
		}

		if (opt.remarks && Array.isArray(d.notes)) {
			res.hints = d.notes.map(h => profile.parseHint(ctx, h))
		}

		return res
	}

	return parseArrOrDep
}

module.exports = createParseArrOrDep
