'use strict'

const parseDateTime = require('./date-time')
const findRemarks = require('./find-remarks')

const clone = obj => Object.assign({}, obj)

const addRemark = (stopoverOrLeg, remark) => {
	if (!Array.isArray(stopoverOrLeg.remarks)) stopoverOrLeg.remarks = []
	stopoverOrLeg.remarks.push(remark)
}

const applyRemarks = (leg, refs) => {
	for (let [remark, ref] of findRemarks(refs)) {
		const {fromLocation, toLocation} = ref

		const fromI = fromLocation ? leg.stopovers.findIndex(s => s.stop === fromLocation) : -1
		const toI = toLocation ? leg.stopovers.findIndex(s => s.stop === toLocation) : -1
		if (fromI < 0 || toI < 0) continue

		const wholeLeg = fromI === 0 && toI === (leg.stopovers.length - 1)
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

const createParseJourneyLeg = (profile, opt, data) => {
	// todo: pt.status, pt.isPartCncl
	// todo: pt.isRchbl, pt.chRatingRT, pt.chgDurR, pt.minChg
	// todo: pt.dep.dProgType, pt.arr.dProgType
	// todo: what is pt.jny.dirFlg?
	// todo: what is pt.recState?
	// todo: what is `sty: 'UNDEF'`?
	// todo: pt.prodL
	// todo: pt.parJnyL (list of coupled trains)

	// j = journey, pt = part
	// todo: pt.planrtTS
	const parseJourneyLeg = (j, pt, parseStopovers = true) => {
		const dep = profile.parseDateTime(profile, j.date, pt.dep.dTimeR || pt.dep.dTimeS, pt.dep.dTZOffset)
		const arr = profile.parseDateTime(profile, j.date, pt.arr.aTimeR || pt.arr.aTimeS, pt.arr.aTZOffset)
		const res = {
			origin: clone(pt.dep.location) || null,
			destination: clone(pt.arr.location),
			departure: dep,
			arrival: arr
		}

		if (pt.jny) {
			res.reachable = !!pt.jny.isRchbl
		}

		// todo: DRY with parseDeparture
		// todo: DRY with parseStopover
		if (pt.dep.dTimeR && pt.dep.dTimeS) {
			const realtime = profile.parseDateTime(profile, j.date, pt.dep.dTimeR, pt.dep.dTZOffset, true)
			const planned = profile.parseDateTime(profile, j.date, pt.dep.dTimeS, pt.dep.dTZOffset, true)
			res.departureDelay = Math.round((realtime - planned) / 1000)
		}
		if (pt.arr.aTimeR && pt.arr.aTimeS) {
			const realtime = profile.parseDateTime(profile, j.date, pt.arr.aTimeR, pt.dep.aTZOffset, true)
			const planned = profile.parseDateTime(profile, j.date, pt.arr.aTimeS, pt.dep.aTZOffset, true)
			res.arrivalDelay = Math.round((realtime - planned) / 1000)
		}

		if (pt.jny && pt.jny.polyline) {
			res.polyline = pt.jny.polyline || null
		}

		if (pt.type === 'WALK' || pt.type === 'TRSF') {
			res.public = true
			res.walking = true
			res.distance = pt.gis && pt.gis.dist || null
			if (pt.type === 'TRSF') res.transfer = true

			// https://gist.github.com/derhuerst/426d4b95aeae701843b1e9c23105b8d4#file-tripsearch-2018-12-05-http-L4207-L4229
			if (opt.remarks && Array.isArray(pt.gis.msgL)) {
				applyRemarks(res, pt.gis.msgL)
			}
		} else if (pt.type === 'JNY') {
			// todo: pull `public` value from `profile.products`
			res.tripId = pt.jny.jid
			res.line = pt.jny.line || null
			res.direction = pt.jny.dirTxt && profile.parseStationName(pt.jny.dirTxt) || null

			res.arrivalPlatform = pt.arr.aPlatfR ||pt.arr.aPlatfS || null
			if (pt.arr.aPlatfR && pt.arr.aPlatfS && pt.arr.aPlatfR !== pt.arr.aPlatfS) {
				res.scheduledArrivalPlatform = pt.arr.aPlatfS
			}

			res.departurePlatform = pt.dep.dPlatfR || pt.dep.dPlatfS || null
			if (pt.dep.dPlatfR && pt.dep.dPlatfS && pt.dep.dPlatfR !== pt.dep.dPlatfS) {
				res.scheduledDeparturePlatform = pt.dep.dPlatfS
			}

			if (parseStopovers && pt.jny.stopL) {
				const parse = profile.parseStopover(profile, opt, data, j.date)
				const stopL = pt.jny.stopL
				res.stopovers = stopL.map(parse)

				if (opt.remarks && Array.isArray(pt.jny.msgL)) {
					// todo: apply leg-wide remarks if `parseStopovers` is false
					applyRemarks(res, pt.jny.msgL)
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
					const st0 = a.stopL[0]

					let when = null, delay = null
					if (st0) {
						const planned = st0.dTimeS && profile.parseDateTime(profile, j.date, st0.dTimeS, st0.dTZOffset)
						if (st0.dTimeR && planned) {
							const realtime = profile.parseDateTime(profile, j.date, st0.dTimeR, st0.dTZOffset)
							when = realtime
							delay = Math.round((new Date(realtime) - new Date(planned)) / 1000)
						} else if (planned) when = planned
					}
					return {
						tripId: a.jid,
						line: a.line || null,
						direction: a.dirTxt || null,
						when, delay
					}
				}
				res.alternatives = freq.jnyL.map(parseAlternative)
			}
		}

		// todo: DRY with parseDeparture
		// todo: DRY with parseStopover
		if (pt.arr.aCncl || pt.dep.dCncl) {
			res.cancelled = true
			Object.defineProperty(res, 'canceled', {value: true})
			if (pt.arr.aCncl) {
				res.arrival = res.arrivalPlatform = res.arrivalDelay = null
				const arr = profile.parseDateTime(profile, j.date, pt.arr.aTimeS, pt.arr.aTZOffset)
				res.scheduledArrival = arr
			}
			if (pt.dep.dCncl) {
				res.departure = res.departurePlatform = res.departureDelay = null
				const dep = profile.parseDateTime(profile, j.date, pt.dep.dTimeS, pt.dep.dTZOffset)
				res.scheduledDeparture = dep
			}
		}

		return res
	}

	return parseJourneyLeg
}

module.exports = createParseJourneyLeg
