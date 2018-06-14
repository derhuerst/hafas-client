'use strict'

const minBy = require('lodash/minBy')
const maxBy = require('lodash/maxBy')

const validateProfile = require('./lib/validate-profile')
const defaultProfile = require('./lib/default-profile')
const _request = require('./lib/request')

const isObj = o => o !== null && 'object' === typeof o && !Array.isArray(o)
const isNonEmptyString = str => 'string' === typeof str && str.length > 0

const createClient = (profile, request = _request) => {
	profile = Object.assign({}, defaultProfile, profile)
	validateProfile(profile)

	const departures = (station, opt = {}) => {
		if (isObj(station)) station = profile.formatStation(station.id)
		else if ('string' === typeof station) station = profile.formatStation(station)
		else throw new Error('station must be an object or a string.')

		opt = Object.assign({
			direction: null, // only show departures heading to this station
			duration:  10 // show departures for the next n minutes
		}, opt)
		opt.when = opt.when || new Date()
		const products = profile.formatProducts(opt.products || {})

		const dir = opt.direction ? profile.formatStation(opt.direction) : null
		return request(profile, {
			meth: 'StationBoard',
			req: {
				type: 'DEP',
				date: profile.formatDate(profile, opt.when),
				time: profile.formatTime(profile, opt.when),
				stbLoc: station,
				dirLoc: dir,
				jnyFltrL: [products],
				dur: opt.duration,
				getPasslist: false
			}
		})
		.then((d) => {
			if (!Array.isArray(d.jnyL)) return [] // todo: throw err?
			const parse = profile.parseDeparture(profile, d.locations, d.lines, d.remarks)
			return d.jnyL.map(parse)
			.sort((a, b) => new Date(a.when) - new Date(b.when))
		})
	}

	const journeys = (from, to, opt = {}) => {
		from = profile.formatLocation(profile, from)
		to = profile.formatLocation(profile, to)

		if (('earlierThan' in opt) && ('laterThan' in opt)) {
			throw new Error('opt.laterThan and opt.laterThan are mutually exclusive.')
		}
		let journeysRef = null
		if ('earlierThan' in opt) {
			if (!isNonEmptyString(opt.earlierThan)) {
				throw new Error('opt.earlierThan must be a non-empty string.')
			}
			if ('when' in opt) {
				throw new Error('opt.earlierThan and opt.when are mutually exclusive.')
			}
			journeysRef = opt.earlierThan
		}
		if ('laterThan' in opt) {
			if (!isNonEmptyString(opt.laterThan)) {
				throw new Error('opt.laterThan must be a non-empty string.')
			}
			if ('when' in opt) {
				throw new Error('opt.laterThan and opt.when are mutually exclusive.')
			}
			journeysRef = opt.laterThan
		}

		opt = Object.assign({
			results: 5, // how many journeys?
			via: null, // let journeys pass this station?
			passedStations: false, // return stations on the way?
			whenRepresents: 'departure', // use 'arrival' for journeys arriving before `when`
			transfers: 5, // maximum of 5 transfers
			transferTime: 0, // minimum time for a single transfer in minutes
			// todo: does this work with every endpoint?
			accessibility: 'none', // 'none', 'partial' or 'complete'
			bike: false, // only bike-friendly journeys
			tickets: false, // return tickets?
			polylines: false // return leg shapes?
		}, opt)
		if (opt.via) opt.via = profile.formatLocation(profile, opt.via)
		opt.when = opt.when || new Date()

		if (opt.whenRepresents !== 'departure' && opt.whenRepresents !== 'arrival') {
			throw new Error('opt.whenRepresents must be `departure` or `arrival`.')
		}

		const filters = [
			profile.formatProducts(opt.products || {})
		]
		if (
			opt.accessibility &&
			profile.filters &&
			profile.filters.accessibility &&
			profile.filters.accessibility[opt.accessibility]
		) {
			filters.push(profile.filters.accessibility[opt.accessibility])
		}

		// With protocol version `1.16`, the VBB endpoint fails with
		// `CGI_READ_FAILED` if you pass `numF`, the parameter for the number
		// of results. To circumvent this, we loop here, collecting journeys
		// until we have enough.
		// see https://github.com/public-transport/hafas-client/pull/23#issuecomment-370246163
		// todo: check if `numF` is supported again, revert this change
		const journeys = []
		const more = (when, journeysRef) => {
			const query = {
				outDate: profile.formatDate(profile, when),
				outTime: profile.formatTime(profile, when),
				ctxScr: journeysRef,
				getPasslist: !!opt.passedStations,
				maxChg: opt.transfers,
				minChgTime: opt.transferTime,
				depLocL: [from],
				viaLocL: opt.via ? [{loc: opt.via}] : null,
				arrLocL: [to],
				jnyFltrL: filters,
				getTariff: !!opt.tickets,
				outFrwd: opt.whenRepresents !== 'arrival',

				// todo: what is req.gisFltrL?
				getPT: true, // todo: what is this?
				getIV: false, // todo: walk & bike as alternatives?
				getPolyline: !!opt.polylines
			}
			if (profile.journeysNumF) query.numF = opt.results

			return request(profile, {
				cfg: {polyEnc: 'GPA'},
				meth: 'TripSearch',
				req: profile.transformJourneysQuery(query, opt)
			})
			.then((d) => {
				if (!Array.isArray(d.outConL)) return []

				let polylines = []
				if (opt.polylines && Array.isArray(d.common.polyL)) {
					polylines = d.common.polyL
				}
				const parse = profile.parseJourney(profile, d.locations, d.lines, d.remarks, polylines)

				if (!journeys.earlierRef) journeys.earlierRef = d.outCtxScrB

				let latestDep = -Infinity
				for (let j of d.outConL) {
					j = parse(j)
					journeys.push(j)

					if (journeys.length === opt.results) { // collected enough
						journeys.laterRef = d.outCtxScrF
						return journeys
					}
					const dep = +new Date(j.departure)
					if (dep > latestDep) latestDep = dep
				}

				const when = new Date(latestDep)
				return more(when, d.outCtxScrF) // otherwise continue
			})
		}

		return more(opt.when, journeysRef)
	}

	const locations = (query, opt = {}) => {
		if (!isNonEmptyString(query)) {
			throw new Error('query must be a non-empty string.')
		}
		opt = Object.assign({
			fuzzy: true, // find only exact matches?
			results: 10, // how many search results?
			stations: true,
			addresses: true,
			poi: true // points of interest
		}, opt)

		const f = profile.formatLocationFilter(opt.stations, opt.addresses, opt.poi)
		return request(profile, {
			cfg: {polyEnc: 'GPA'},
			meth: 'LocMatch',
			req: {input: {
				loc: {
					type: f,
					name: opt.fuzzy ? query + '?' : query
				},
				maxLoc: opt.results,
				field: 'S' // todo: what is this?
			}}
		})
		.then((d) => {
			if (!d.match || !Array.isArray(d.match.locL)) return []
			const parse = profile.parseLocation
			return d.match.locL.map(loc => parse(profile, loc, d.lines))
		})
	}

	const location = (station) => {
		if ('object' === typeof station) station = profile.formatStation(station.id)
		else if ('string' === typeof station) station = profile.formatStation(station)
		else throw new Error('station must be an object or a string.')

		return request(profile, {
			meth: 'LocDetails',
			req: {
				locL: [station]
			}
		})
		.then((d) => {
			if (!d || !Array.isArray(d.locL) || !d.locL[0]) {
				// todo: proper stack trace?
				throw new Error('invalid response')
			}
			return profile.parseLocation(profile, d.locL[0], d.lines)
		})
	}

	const nearby = (location, opt = {}) => {
		if (!isObj(location)) {
			throw new Error('location must be an object.')
		} else if (location.type !== 'location') {
			throw new Error('invalid location object.')
		} else if ('number' !== typeof location.latitude) {
			throw new Error('location.latitude must be a number.')
		} else if ('number' !== typeof location.longitude) {
			throw new Error('location.longitude must be a number.')
		}

		opt = Object.assign({
			results: 8, // maximum number of results
			distance: null, // maximum walking distance in meters
			poi: false, // return points of interest?
			stations: true, // return stations?
		}, opt)

		return request(profile, {
			cfg: {polyEnc: 'GPA'},
			meth: 'LocGeoPos',
			req: {
				ring: {
					cCrd: {
						x: profile.formatCoord(location.longitude),
						y: profile.formatCoord(location.latitude)
					},
					maxDist: opt.distance || -1,
					minDist: 0
				},
				getPOIs: !!opt.poi,
				getStops: !!opt.stations,
				maxLoc: opt.results
			}
		})
		.then((d) => {
			if (!Array.isArray(d.locL)) return []
			const parse = profile.parseNearby
			return d.locL.map(loc => parse(profile, loc))
		})
	}

	const journeyLeg = (ref, lineName, opt = {}) => {
		if (!isNonEmptyString(ref)) {
			throw new Error('ref must be a non-empty string.')
		}
		if (!isNonEmptyString(lineName)) {
			throw new Error('lineName must be a non-empty string.')
		}
		opt = Object.assign({
			passedStations: true, // return stations on the way?
			polyline: false
		}, opt)
		opt.when = opt.when || new Date()

		return request(profile, {
			cfg: {polyEnc: 'GPA'},
			meth: 'JourneyDetails',
			req: {
				// todo: getTrainComposition
				jid: ref,
				name: lineName,
				date: profile.formatDate(profile, opt.when),
				getPolyline: !!opt.polyline
			}
		})
		.then((d) => {
			let polylines = []
			if (opt.polyline && Array.isArray(d.common.polyL)) {
				polylines = d.common.polyL
			}
			const parse = profile.parseJourneyLeg(profile, d.locations, d.lines, d.remarks, polylines)

			const leg = { // pretend the leg is contained in a journey
				type: 'JNY',
				dep: minBy(d.journey.stopL, 'idx'),
				arr: maxBy(d.journey.stopL, 'idx'),
				jny: d.journey
			}
			return parse(d.journey, leg, !!opt.passedStations)
		})
	}

	const radar = (north, west, south, east, opt) => {
		if ('number' !== typeof north) throw new Error('north must be a number.')
		if ('number' !== typeof west) throw new Error('west must be a number.')
		if ('number' !== typeof south) throw new Error('south must be a number.')
		if ('number' !== typeof east) throw new Error('east must be a number.')

		opt = Object.assign({
			results: 256, // maximum number of vehicles
			duration: 30, // compute frames for the next n seconds
			frames: 3, // nr of frames to compute
			products: null, // optionally an object of booleans
			polylines: false // return a track shape for each vehicle?
		}, opt || {})
		opt.when = opt.when || new Date()

		const durationPerStep = opt.duration / Math.max(opt.frames, 1) * 1000
		return request(profile, {
			meth: 'JourneyGeoPos',
			req: {
				maxJny: opt.results,
				onlyRT: false, // todo: does this mean "only realtime"?
				date: profile.formatDate(profile, opt.when),
				time: profile.formatTime(profile, opt.when),
				// todo: would a ring work here as well?
				rect: profile.formatRectangle(profile, north, west, south, east),
				perSize: opt.duration * 1000,
				perStep: Math.round(durationPerStep),
				ageOfReport: true, // todo: what is this?
				jnyFltrL: [
					profile.formatProducts(opt.products || {})
				],
				trainPosMode: 'CALC' // todo: what is this? what about realtime?
			}
		})
		.then((d) => {
			if (!Array.isArray(d.jnyL)) return []

			let polylines = []
			if (opt.polylines && d.common && Array.isArray(d.common.polyL)) {
				polylines = d.common.polyL
			}
			const parse = profile.parseMovement(profile, d.locations, d.lines, d.remarks, polylines)
			return d.jnyL.map(parse)
		})
	}

	const client = {departures, journeys, locations, location, nearby}
	if (profile.journeyLeg) client.journeyLeg = journeyLeg
	if (profile.radar) client.radar = radar
	Object.defineProperty(client, 'profile', {value: profile})
	return client
}

module.exports = createClient
