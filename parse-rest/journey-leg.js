'use strict'

const parseIsoDuration = require('parse-iso-duration')
const sortBy = require('lodash/sortBy')

const parseJourneyLeg = (ctx, l) => { // l = leg
	const {profile, opt} = ctx

	const orig = l.Origin
	const dest = l.Destination

	const res = {
		origin: profile.parseLocation(ctx, orig),
		destination: profile.parseLocation(ctx, dest)
	}

	// todo: does `dest.rtAlighting` actually if the arrival is cancelled?
	const arr = profile.parseWhen(ctx, dest.date, dest.rtDate, dest.time, dest.rtTime, dest.rtTz, dest.rtAlighting === false)
	res.arrival = arr.when
	res.plannedArrival = arr.plannedWhen
	res.arrivalDelay = arr.delay
	if (arr.prognosedWhen) res.prognosedArrival = arr.prognosedWhen

	// todo: does `orig.rtBoarding` actually if the departure is cancelled?
	const dep = profile.parseWhen(ctx, orig.date, orig.rtDate, orig.time, orig.rtTime, orig.tz, orig.rtBoarding === false)
	res.departure = dep.when
	res.plannedDeparture = dep.plannedWhen
	res.departureDelay = dep.delay
	if (dep.prognosedWhen) res.prognosedDeparture = dep.prognosedWhen

	if (orig.rtBoarding === false || dest.rtAlighting === false) {
		res.cancelled = true
		Object.defineProperty(res, 'canceled', {value: true})
	}

	if (l.type === 'WALK' || l.type === 'TRSF') {
		res.public = true
		res.walking = true
		res.distance = l.dist || null
		// if (l.type === 'TRSF') res.transfer = true
		// todo: l.GisRef
		res.duration = l.duration ? parseIsoDuration(l.duration) / 1000 | 0 : null
	} else if (l.type === 'JNY') {
		// todo: does `dest.rtAlighting` actually say if the arrival is cancelled?
		const arrPl = profile.parsePlatform(ctx, dest.track, dest.rtTrack, !dest.rtAlighting)
		res.arrivalPlatform = arrPl.platform
		res.plannedArrivalPlatform = arrPl.plannedPlatform
		if (arrPl.prognosedPlatform) res.prognosedArrivalPlatform = arrPl.prognosedPlatform

		// todo: does `orig.rtBoarding` actually if say the departure is cancelled?
		const depPl = profile.parsePlatform(ctx, orig.track, orig.rtTrack, !orig.rtBoarding)
		res.departurePlatform = depPl.platform
		res.plannedDeparturePlatform = depPl.plannedPlatform
		if (depPl.prognosedPlatform) res.prognosedDeparturePlatform = depPl.prognosedPlatform

		// todo: pull `public` value from `profile.products`
		res.tripId = l.JourneyDetailRef && l.JourneyDetailRef.ref || null

		// todo: is it num instead of number?
		const product = {name: l.name, number: l.number, ...l.Product}
		res.line = profile.parseLine(ctx, product) || null

		res.direction = l.direction && profile.parseStationName(ctx, l.direction) || null

		if (opt.stopovers && l.stops) {
			res.stopovers = sortBy(l.stops, 'routeIdx')
			.map(st => profile.parseStopover(ctx, st))
		}
	}

	if (opt.polylines && l.Polyline) {
		res.polyline = profile.parsePolyline(ctx, l.Polyline) || null
	}

	if (opt.remarks && Array.isArray(l.notes)) {
		res.hints = l.notes.map(h => profile.parseHint(ctx, h))
	}

	return res
}

module.exports = parseJourneyLeg
