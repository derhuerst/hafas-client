'use strict'

const findRemarks = require('./find-remarks')

const parseStopover = (ctx, st, date) => { // st = raw stopover
	const {parsed, profile, opt} = ctx

	const arr = profile.parseWhen(ctx, date, st.aTimeS, st.aTimeR, st.aTZOffset, st.aCncl)
	const arrPl = profile.parsePlatform(ctx, st.aPlatfS, st.aPlatfR, st.aCncl)
	const dep = profile.parseWhen(ctx, date, st.dTimeS, st.dTimeR, st.dTZOffset, st.dCncl)
	const depPl = profile.parsePlatform(ctx, st.dPlatfS, st.dPlatfR, st.dCncl)

	const res = {
		...parsed,
		stop: st.location || null,
		arrival: arr.when,
		plannedArrival: arr.plannedWhen,
		arrivalDelay: arr.delay,
		arrivalPlatform: arrPl.platform,
		plannedArrivalPlatform: arrPl.plannedPlatform,
		departure: dep.when,
		plannedDeparture: dep.plannedWhen,
		departureDelay: dep.delay,
		departurePlatform: depPl.platform,
		plannedDeparturePlatform: depPl.plannedPlatform
	}

	if (arr.prognosedWhen) res.prognosedArrival = arr.prognosedWhen
	if (arrPl.prognosedPlatform) res.prognosedArrivalPlatform = arrPl.prognosedPlatform
	if (dep.prognosedWhen) res.prognosedDeparture = dep.prognosedWhen
	if (depPl.prognosedPlatform) res.prognosedDeparturePlatform = depPl.prognosedPlatform

	// mark stations the train passes without stopping
	if(st.dInS === false && st.aOutS === false) res.passBy = true

	if (st.aCncl || st.dCncl) {
		res.cancelled = true
		Object.defineProperty(res, 'canceled', {value: true})
	}

	if (opt.remarks && Array.isArray(st.msgL)) {
		res.remarks = findRemarks(st.msgL).map(([remark]) => remark)
	}

	return res
}

module.exports = parseStopover
