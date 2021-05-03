'use strict'

const findRemarks = require('./find-remarks')

const ARRIVAL = 'a'
const DEPARTURE = 'd'

// todo: what is d.jny.dirFlg?
// todo: d.stbStop.dProgType/d.stbStop.aProgType
// todo: d.stbStop.dProdX/aProdX can be different than d.prodX

const createParseArrOrDep = (prefix) => {
	if (prefix !== ARRIVAL && prefix !== DEPARTURE) throw new Error('invalid prefix')

	const parseArrOrDep = (ctx, d) => { // d = raw arrival/departure
		const {profile, opt} = ctx

		const tPlanned = d.stbStop[prefix + 'TimeS']
		const tPrognosed = d.stbStop[prefix + 'TimeR']
		const tzOffset = d.stbStop[prefix + 'TZOffset'] || null
		const cancelled = !!d.stbStop[prefix + 'Cncl']
		const plPlanned = d.stbStop[prefix + 'PlatfS'] || (d.stbStop[prefix + 'PltfS'] && d.stbStop[prefix + 'PltfS'].txt) || null
		const plPrognosed = d.stbStop[prefix + 'PlatfR'] || (d.stbStop[prefix + 'PltfR'] && d.stbStop[prefix + 'PltfR'].txt) || null

		const res = {
			tripId: d.jid,
			stop: d.stbStop.location || null,
			...profile.parseWhen(ctx, d.date, tPlanned, tPrognosed, tzOffset, cancelled),
			...profile.parsePlatform(ctx, plPlanned, plPrognosed, cancelled),
			// todo: for arrivals, this is the *origin*, not the *direction*
			direction: prefix === DEPARTURE && d.dirTxt && profile.parseStationName(ctx, d.dirTxt) || null,
			provenance: prefix === ARRIVAL && d.dirTxt && profile.parseStationName(ctx, d.dirTxt) || null,
			line: d.line || null,
			remarks: []
		}

		if (cancelled) {
			res.cancelled = true
			Object.defineProperty(res, 'canceled', {value: true})
		}

		if (opt.remarks) {
			res.remarks = findRemarks(ctx, [
				...(d.remL || []),
				...(d.msgL || [])
			]).map(([remark]) => remark)
		}

		if (opt.stopovers && Array.isArray(d.stopL)) {
			// Filter stations the train passes without stopping, as this doesn't comply with FPTF (yet).
			const stopovers = d.stopL
			.map(st => profile.parseStopover(ctx, st, d.date))
			.filter(st => !st.passBy)
			if (prefix === ARRIVAL) res.previousStopovers = stopovers
			else if (prefix === DEPARTURE) res.nextStopovers = stopovers
		}

		return res
	}

	return parseArrOrDep
}

module.exports = createParseArrOrDep
