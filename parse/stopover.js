'use strict'

const findRemarks = require('./find-remarks')

const parseStopover = (ctx, st, date) => { // st = raw stopover
	const {profile, opt} = ctx

	const arr = profile.parseWhen(ctx, date, st.aTimeS, st.aTimeR, st.aTZOffset, st.aCncl)
	const dep = profile.parseWhen(ctx, date, st.dTimeS, st.dTimeR, st.dTZOffset, st.dCncl)

	const aPlatfS = (
		st.aPlatfS
		|| (st.aPltfS ? st.aPltfS.txt : null)
		|| (st.aPlatformS && st.aPlatformS.text) // todo: what is aPlatformS.type?
	)
	const aPlatfR = (
		st.aPlatfR
		|| (st.aPltfR ? st.aPltfR.txt : null)
		|| (st.aPlatformR && st.aPlatformR.text) // todo: what is aPlatformR.type?
	)
	const arrPl = profile.parsePlatform(ctx, aPlatfS, aPlatfR, st.aCncl)

	const dPlatfS = (
		st.dPlatfS
		|| (st.dPltfS ? st.dPltfS.txt : null)
		|| (st.dPlatformS && st.dPlatformS.text) // todo: what is dPlatformS.type?
	)
	const dPlatfR = (
		st.dPlatfR
		|| (st.dPltfR ? st.dPltfR.txt : null)
		|| (st.dPlatformR && st.dPlatformR.text) // todo: what is aPlatformR.type?
	)
	const depPl = profile.parsePlatform(ctx, dPlatfS, dPlatfR, st.dCncl)

	const res = {
		stop: (
			st.location
			|| (st.loc && profile.parseLocation(ctx, st.loc))
			|| null
		),
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
		res.remarks = findRemarks(ctx, st.msgL).map(([remark]) => remark)
	}

	return res
}

module.exports = parseStopover
