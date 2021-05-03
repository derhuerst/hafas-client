'use strict'

const findRemarks = require('./find-remarks')

const clone = obj => Object.assign({}, obj)

const addRemark = (stopoverOrLeg, remark) => {
	if (!Array.isArray(stopoverOrLeg.remarks)) stopoverOrLeg.remarks = []
	stopoverOrLeg.remarks.push(remark)
}

const applyRemarks = (ctx, leg, refs) => {
	for (let [remark, ref] of findRemarks(ctx, refs)) {
		const {fromLocation, toLocation} = ref

		let wholeLeg = true, fromI = 0, toI = 0
		if (Array.isArray(leg.stopovers)) {
			toI = leg.stopovers.length - 1
			// this fails if `s.stop` is a new object (not reference-equal)
			// todo: do this index- or ID-based
			if (fromLocation) {
				fromI = leg.stopovers.findIndex(s => s.stop === fromLocation)
				if (fromI < 0) continue
			}
			if (toLocation) {
				toI = leg.stopovers.findIndex(s => s.stop === toLocation)
				if (toI < 0) continue
			}
			wholeLeg = fromI === 0 && toI === (leg.stopovers.length - 1)
		}

		if (wholeLeg) addRemark(leg, remark)
		else {
			for (let i = fromI; i <= toI; i++) {
				const stopover = leg.stopovers[i]
				if (stopover) addRemark(stopover, remark)
			}
		}

		// todo: `ref.tagL`
	}
}

// todo: pt.status, pt.isPartCncl
// todo: pt.isRchbl, pt.chRatingRT, pt.chgDurR, pt.minChg
// todo: pt.dep.dProgType, pt.arr.dProgType
// todo: what is pt.jny.dirFlg?
// todo: what is pt.recState?
// todo: what is `sty: 'UNDEF'`?
// todo: pt.prodL
// todo: pt.parJnyL (list of coupled trains)
// todo: pt.planrtTS

const parseJourneyLeg = (ctx, pt, date) => { // pt = raw leg
	const {profile, opt} = ctx

	const res = {
		origin: (
			(pt.dep.location && clone(pt.dep.location))
			|| (pt.dep.loc && profile.parseLocation(ctx, pt.dep.loc))
			|| null
		),
		destination: (
			(pt.arr.location && clone(pt.arr.location))
			|| (pt.arr.loc && profile.parseLocation(ctx, pt.arr.loc))
			|| null
		),
	}

	const dep = profile.parseWhen(ctx, date, pt.dep.dTimeS, pt.dep.dTimeR, pt.dep.dTZOffset, pt.dep.dCncl)
	res.departure = dep.when
	res.plannedDeparture = dep.plannedWhen
	res.departureDelay = dep.delay
	if (dep.prognosedWhen) res.prognosedDeparture = dep.prognosedWhen

	const arr = profile.parseWhen(ctx, date, pt.arr.aTimeS, pt.arr.aTimeR, pt.arr.aTZOffset, pt.arr.aCncl)
	res.arrival = arr.when
	res.plannedArrival = arr.plannedWhen
	res.arrivalDelay = arr.delay
	if (arr.prognosedWhen) res.prognosedArrival = arr.prognosedWhen

	if (pt.jny && ('isRchbl' in pt.jny)) {
		res.reachable = !!pt.jny.isRchbl
	}

	// todo: pt.jny.polylineGroup.polylineList[]
	if (pt.jny && pt.jny.polyline) {
		res.polyline = pt.jny.polyline || null
	} else if (pt.jny && pt.jny.poly) {
		res.polyline = profile.parsePolyline(ctx, pt.jny.poly)
	}

	if (pt.type === 'WALK' || pt.type === 'TRSF' || pt.type === 'DEVI') {
		res.public = true
		res.walking = true
		res.distance = pt.gis && pt.gis.dist || null
		if (pt.type === 'TRSF') res.transfer = true
		if (pt.type === 'DEVI') {
			// todo: pt.resState, pt.resRecommendation
			res.transfer = true
		}

		// https://gist.github.com/derhuerst/426d4b95aeae701843b1e9c23105b8d4#file-tripsearch-2018-12-05-http-L4207-L4229
		if (opt.remarks && pt.gis && Array.isArray(pt.gis.msgL)) {
			applyRemarks(ctx, res, pt.gis.msgL)
		}
	} else if (pt.type === 'JNY' || pt.type === '2') { // todo: what does `2` mean?
		// todo: pull `public` value from `profile.products`
		res.tripId = pt.jny.jid
		res.line = (
			pt.jny.line
			|| (pt.jny.prod && profile.parseLine(ctx, pt.jny.prod))
			|| null
		)
		res.direction = pt.jny.dirTxt && profile.parseStationName(ctx, pt.jny.dirTxt) || null

		const aPlatfS = (
			pt.arr.aPlatfS
			|| (pt.arr.aPltfS ? pt.arr.aPltfS.txt : null)
			|| (pt.arr.aPlatformS && pt.arr.aPlatformS.text) // todo: what is aPlatformS.type?
		)
		const aPlatfR = (
			pt.arr.aPlatfR
			|| (pt.arr.aPltfR ? pt.arr.aPltfR.txt : null)
			|| (pt.arr.aPlatformR && pt.arr.aPlatformR.text) // todo: what is aPlatformR.type?
		)
		const arrPl = profile.parsePlatform(ctx, aPlatfS, aPlatfR, pt.arr.aCncl)
		res.arrivalPlatform = arrPl.platform
		res.plannedArrivalPlatform = arrPl.plannedPlatform
		if (arrPl.prognosedPlatform) res.prognosedArrivalPlatform = arrPl.prognosedPlatform

		const dPlatfS = (
			pt.dep.dPlatfS
			|| (pt.dep.dPltfS ? pt.dep.dPltfS.txt : null)
			|| (pt.dep.dPlatformS && pt.dep.dPlatformS.text) // todo: what is dPlatformS.type?
		)
		const dPlatfR = (
			pt.dep.dPlatfR
			|| (pt.dep.dPltfR ? pt.dep.dPltfR.txt : null)
			|| (pt.dep.dPlatformR && pt.dep.dPlatformR.text) // todo: what is dPlatformR.type?
		)
		const depPl = profile.parsePlatform(ctx, dPlatfS, dPlatfR, pt.dep.dCncl)
		res.departurePlatform = depPl.platform
		res.plannedDeparturePlatform = depPl.plannedPlatform
		if (depPl.prognosedPlatform) res.prognosedDeparturePlatform = depPl.prognosedPlatform

		if (opt.stopovers && pt.jny.stopL) {
			const stopL = pt.jny.stopL
			res.stopovers = stopL.map(s => profile.parseStopover(ctx, s, date))

			const msgL = (
				(Array.isArray(pt.jny.msgL) && pt.jny.msgL)
				|| (Array.isArray(pt.jny.msgListElement) && pt.jny.msgListElement)
				|| null
			)
			if (opt.remarks && Array.isArray(msgL)) {
				// todo: apply leg-wide remarks if `opt.stopovers` is false
				applyRemarks(ctx, res, msgL)
			}

			// filter stations the train passes without stopping, as this doesn't comply with fptf (yet)
			res.stopovers = res.stopovers.filter((x) => !x.passBy)
		}

		const freq = pt.jny.freq || {}
		// todo: expose `res.cycle` even if only one field exists (breaking)
		if (freq.minC && freq.maxC) {
			res.cycle = {
				min: freq.minC * 60,
				max: freq.maxC * 60
			}
			// nr of connections in this frequency, from now on
			if (freq.numC) res.cycle.nr = freq.numC
		}

		if (freq.jnyL) {
			const parseAlternative = (a) => {
				// todo: parse this just like a `leg` (breaking)
				// todo: parse `a.stopL`, `a.ctxRecon`, `a.msgL`
				const st0 = Array.isArray(a.stopL) && a.stopL[0] || {}
				const when = st0
					? profile.parseWhen(ctx, date, st0.dTimeS, st0.dTimeR, st0.dTZOffset, st0.dCncl)
					: null
				return {
					tripId: a.jid,
					line: (
						a.line
						|| (a.prod && profile.parseLine(ctx, a.prod))
						|| null
					),
					direction: a.dirTxt || null,
					...when,
				}
			}
			res.alternatives = freq.jnyL.map(parseAlternative)
		}
	}

	if (pt.arr.aCncl || pt.dep.dCncl) {
		res.cancelled = true
		Object.defineProperty(res, 'canceled', {value: true})
	}

	return res
}

module.exports = parseJourneyLeg
