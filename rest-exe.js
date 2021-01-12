'use strict'

const DEBUG = process.env.DEBUG === 'hafas-client'

const Promise = require('pinkie-promise')
const {fetch} = require('fetch-ponyfill')({Promise})
const {stringify} = require('qs')
const {parse: parseContentType} = require('content-type')
const findInTree = require('./lib/find-in-tree')
const randomizeUserAgent = require('./lib/randomize-user-agent')
const {byErrorCode} = require('./lib/rest-exe-errors')
const parseWhen = require('./parse-rest/when')
const parseLine = require('./parse-rest/line')
const parsePolyline = require('./parse-rest/polyline')
const parseHint = require('./parse-rest/hint')
const parseJourney = require('./parse-rest/journey')
const parseJourneyLeg = require('./parse-rest/journey-leg')
const parseStopover = require('./parse-rest/stopover')
const parseLocation = require('./parse-rest/location')
const parseArrivalOrDeparture = require('./parse-rest/arrival-or-departure')
const parseTrip = require('./parse-rest/trip')
const formatDate = require('./format-rest/date')
const formatTime = require('./format-rest/time')
const defaultProfile = require('./lib/default-profile')
const dbMgateProfile = require('./p/db')

const isNonEmptyString = str => 'string' === typeof str && str.length > 0

const createRestClient = (profile, token, userAgent) => {
	profile = {
		...defaultProfile,
		...dbMgateProfile,
		parseWhen,
		parseLine,
		parsePolyline,
		parseHint,
		parseJourney,
		parseJourneyLeg,
		parseStopover,
		parseArrivalOrDeparture,
		parseLocation,
		parseTrip,
		formatDate,
		formatTime,
		...profile
	}
	if (!isNonEmptyString(profile.endpoint)) throw new Error('missing profile.endpoint')
	if (!isNonEmptyString(token)) throw new Error('missing token')
	if (!isNonEmptyString(userAgent)) throw new Error('missing userAgent')

	const request = async (method, opt, query = {}) => {
		query = {
			lang: opt.language || 'en',
			...query,
			format: 'json'
		}
		if (DEBUG) console.error(JSON.stringify(query))

		const url = profile.endpoint + method + '?' + stringify({...query, accessId: token})
		const fetchCfg = {
			headers: {
				'accept-encoding': 'gzip, br, deflate',
				'accept': 'application/json',
				'user-agent': randomizeUserAgent(userAgent)
			},
			redirect: 'follow'
		}
		const res = await fetch(url, fetchCfg)

		const cTypeHeader = res.headers.get('content-type')
		const {type: cType} = cTypeHeader ? parseContentType(cTypeHeader) : {}
		const asJSON = cType === 'application/json'
		const body = asJSON ? await res.json() : await res.text()
		if (DEBUG) console.error(asJSON ? JSON.stringify(body) : body)

		if (!res.ok) {
			// todo: parse HTML error messages
			let err = new Error(res.statusText)
			if (asJSON) {
				const {errorCode, errorText} = body
				if (errorCode && byErrorCode[errorCode]) {
					Object.assign(err, byErrorCode[errorCode])
					err.hafasErrorCode = errorCode
					if (errorText) err.hafasErrorMessage = errorText
				} else {
					err = new Error(errorText)
					err.code = errorCode
				}
			} else if (body) err = new Error(body)

			err.statusCode = res.status
			err.endpoint = profile.endpoint
			err.url = url
			err.query = query
			err.fetchCfg = fetchCfg
			throw err
		}

		// todo: sometimes it returns a body without any data
		// e.g. `location.nearbystops` with an invalid `type`

		const mapping = {
			'**.Stops.Stop': 'stops',
			'**.Names.Name': 'products',
			'**.Directions.Direction': 'directions',
			'**.JourneyDetailRef.ref': 'ref',
			'**.Notes.Note': 'notes',
			'**.LegList.Leg': 'legs',
			'**.ServiceDays[0]': 'serviceDays',
		}

		const allMatches = findInTree(Object.keys(mapping))(body)
		for (const [needle, matches] of Object.entries(allMatches)) {
			const newKey = mapping[needle]

			for (const [item, parents] of matches) {
				const grandParent = parents[1]
				grandParent[newKey] = item
			}
		}

		return {profile, opt, res: body}
	}

	const parseLocationsResult = (l, ctx) => {
		if (l.StopLocation) {
			return profile.parseLocation(ctx, {
				type: 'ST', ...l.StopLocation
			})
		}
		if (l.CoordLocation) {
			return profile.parseLocation(ctx, {
				type: 'ADR', ...l.CoordLocation
			})
		}
		return null
	}

	const locations = async (query, opt = {}) => {
		if (!isNonEmptyString(query)) {
			throw new TypeError('query must be a non-empty string.')
		}
		opt = {
			fuzzy: true, // find only exact matches?
			results: 5, // how many search results?
			stops: true, // return stops/stations?
			addresses: true,
			poi: true, // points of interest
			linesOfStops: false, // parse & expose lines at each stop/station?
			...opt
		}

		const ctx = await request('location.name', opt, {
			input: opt.fuzzy ? query + '?' : query,
			maxNo: 3, // todo: opt.results
			type: profile.formatLocationFilter(opt.stops, opt.addresses, opt.poi)
			// todo: `products` with bitmask
			// todo: coordLong, coordLat, radius
			// todo: refineId
		})

		return ctx.res.stopLocationOrCoordLocation
		.map(l => parseLocationsResult(l, ctx))
		.filter(loc => !!loc)
	}

	const nearby = async (location, opt = {}) => {
		const ctx = await request('location.nearbystops', opt, {
			originCoordLat: location.latitude,
			originCoordLong: location.longitude,
			// r: 2000, // radius
			// maxNo: 5, // todo: opt.results
			type: 'SP', // todo: S/P/SP
			// todo: `products` with bitmask
		})

		return ctx.res.stopLocationOrCoordLocation
		.map((l) => {
			const loc = parseLocationsResult(l, ctx)
			if (loc) loc.distance = l.dist
			return loc
		})
		.filter(loc => !!loc)
	}

	const _stationBoard = async (method, stop, opt) => {
		const stopId = 'string' === typeof stop ? stop : stop.id
		if ('string' !== typeof stopId) {
			throw new TypeError('stop must be a stop object or a string.')
		}

		opt = {
			// todo: for arrivals(), this is actually a station it *has already* stopped by
			direction: null, // only show arrivals/departures stopping by this station
			duration: 10, // show arrivals/departures for the next n minutes
			results: null, // number of arrivals/departures – `null` means "whatever HAFAS returns"
			products: {}, // enabled/disable certain products to search for
			remarks: true, // parse & expose hints & warnings?
			// arrivals/departures at related stations
			// e.g. those that belong together on the metro map.
			includeRelatedStations: true,
			...opt
		}

		const query = {
			extId: stopId,
			duration: opt.duration,
			products: profile.formatProductsBitmask({profile, opt}, opt.products || {}),
			filterEquiv: opt.includeRelatedStations ? 0 : 1, // filterEquiv is reversed!
			rtMode: 'FULL' // todo: make customisable?, see https://pastebin.com/qZ9WS3Cx
			// todo: operators, lines, attributes
		}

		if (opt.direction) {
			const id = 'string' === typeof opt.direction ? opt.direction : opt.direction.id
			if ('string' !== typeof id) {
				throw new TypeError('opt.direction must be a stop object or a string.')
			}
			query.direction = id
		}
		if (opt.results !== null) query.maxJourneys = opt.results

		const when = new Date('when' in opt ? opt.when : Date.now())
		if (Number.isNaN(+when)) throw new Error('opt.when is invalid')
		query.date = profile.formatDate({profile, opt}, when)
		query.time = profile.formatTime({profile, opt}, when)

		return await request(method, opt, query)
	}

	const departures = async (stop, opt = {}) => {
		const ctx = await _stationBoard('departureBoard', stop, opt)
		const results = ctx.res.departureAndMessage || []

		const parse = profile.parseArrivalOrDeparture('departure')
		return results.map(result => parse(ctx, result.Departure))
	}

	const arrivals = async (stop, opt = {}) => {
		const ctx = await _stationBoard('arrivalBoard', stop, opt)
		const results = ctx.res.arrivalAndMessage || []

		const parse = profile.parseArrivalOrDeparture('arrival')
		return results.map(result => parse(ctx, result.Arrival))
	}

	const journeys = async (origin, destination, opt = {}) => {
		opt = {
			results: null, // number of journeys – `null` means "whatever HAFAS returns"
			// via: null, // let journeys pass this station?
			stopovers: false, // return stations on the way?
			transfers: -1, // maximum of 5 transfers
			transferTime: null, // minimum time for a single transfer in minutes
			// // todo: does this work with every endpoint?
			// accessibility: 'none', // 'none', 'partial' or 'complete'
			// bike: false, // only bike-friendly journeys
			// tickets: false, // return tickets?
			polylines: false, // return leg shapes?
			// remarks: true, // parse & expose hints & warnings?
			// walkingSpeed: 'normal', // 'slow', 'normal', 'fast'
			// // Consider walking to nearby stations at the beginning of a journey?
			startWithWalking: true,
			// scheduledDays: false
			...opt
		}

		// todo:
		// - context via opt.earlierThan/opt.laterThan
		// - originCoordLat/originCoordLong, destCoordLat/destCoordLong
		// - via or viaId & viaWaitTime, avoid or avoidId
		// - changeTimePercent, maxChangeTime?, addChangeTime?
		// - numB
		// - products, operators, attributes, sattributes, lines, ivOnly, mobilityProfile?
		// - trainFilter, groupFilter, blockingList
		// - bikeCarriage, bikeCarriageType, sleepingCar, couchetteCoach
		// - avoidPaths, originBike, originCar, originTaxi, originPark, originMeta
		// - destBike, destCar, destTaxi, destPark, destMeta
		// - totalBike, totalCar, totalTaxi, totalPark, totalMeta
		// - baim (https://www.eltis.org/discover/case-studies/baim-information-people-reduced-mobility-field-public-transport-frankfurt-de)
		// 		hcp_0 – Do not filter.
		// 			Results: baim_1, baim_2, baim_3, baim_4
		// 		hcp_1 – Boarding and alighting possible.
		// 			Results: baim_1
		// 		hcp_2 – Boarding and alighting possible with the help of the crew.
		// 			Results: baim_1, baim_2
		// 		hcp_3 – Boarding and alighting requires advance notification.
		// 			Results: baim_1, baim_2, baim_3
		// 		Result values baim_info and baim_rsv are not filterable and will be returned if present.
		// - eco, ecoCmp, ecoParams
		// - economic
		// - withICTAlternatives
		const query = {
			originId: profile.formatLocation(profile, origin, 'origin').lid,
			destId: profile.formatLocation(profile, destination, 'destination').lid,
			poly: opt.polylines ? 1 : 0,
			passlist: opt.stopovers ? 1 : 0,
			showPassingPoints: 1, // return pass-by stopovers
			eco: 0,
			originWalk: opt.startWithWalking ? 1 : 0,
			destWalk: 1,
			rtMode: 'FULL', // todo: make customisable?, see https://pastebin.com/qZ9WS3Cx
			// "take additional stations nearby the given start and destination station into account"
			ushrp: 1,
			// "Disables search optimization in relation of duration."
			includeEarlier: 1 // todo: make customisable?
		}
		if (opt.transferTime !== null) query.minChangeTime = opt.transferTime
		if (opt.transfers >= 0) query.maxChange = opt.transfers
		if (opt.results !== null) query.numF = opt.results // todo: what about numB?

		let when
		if (opt.departure !== undefined && opt.departure !== null) {
			when = new Date(opt.departure)
			if (Number.isNaN(+when)) throw new TypeError('opt.departure is invalid')
		} else if (opt.arrival !== undefined && opt.arrival !== null) {
			when = new Date(opt.arrival)
			if (Number.isNaN(+when)) throw new TypeError('opt.arrival is invalid')
			query.searchForArrival = 1
		}
		if (when) {
			query.date = profile.formatDate({profile, opt}, when)
			query.time = profile.formatTime({profile, opt}, when)
		}

		const ctx = await request('trip', opt, query)
		return ctx.res.Trip.map(t => profile.parseJourney(ctx, t))
	}

	const tripAlternatives = async (tripCtx, origin, destination, opt = {}) => {
		// todo
		const ctx = await request('trip.alternatives', opt, {
			ctx: 'T$A=1@O=Hildesheim Hbf@L=8000169@a=128@$A=1@O=Hannover Hbf@L=8000152@a=128@$201909031844$201909031910$erx83478$$1$',
			originId: 'A=1@O=Sarstedt@X=9842595@Y=52232604@U=80@L=8005292@',
			destId: 'A=1@O=Hannover Hbf@X=9741017@Y=52376764@U=80@L=8000152@',
			// todo: operators, products, poly
		})

		return ctx.res.Trip.map(t => profile.parseJourney(ctx, t))
	}

	const trip = async (id, opt = {}) => {
		const ctx = await request('journeyDetail', opt, {
			id,
			// todo: date, poly, showPassingPoints, rtMode
		})

		return profile.parseTrip(ctx, ctx.res)
	}

	// todo: fails with 404
	// const tripHistory = async (tripId) => {
	// 	const ctx = await request('rtarchive', opt, {
	// 		id: tripId,
	// 		date: profile.formatDate({profile, opt}, opt.when || Date.now())
	// 	})
	// 	return ctx.res
	// }

	// todo: fails with 404
	// const radar = async (bbox) => {
	// 	const ctx = await request('journeyPos', opt, {
	// 		llLat: bbox.south,
	// 		llLon: bbox.west,
	// 		urLat: bbox.north,
	// 		urLon: bbox.east,
	// 		// todo: operators, products, attributes, lines, jid, infotexts
	// 		// todo: maxJny, time
	// 		date: profile.formatDate({profile, opt}, opt.when || Date.now())
	// 	})
	// 	return ctx.res
	// }

	// todo: fails with 404
	// const remarks = async () => {
	// 	const ctx = await request('himSearch', opt, {
	// 		// todo: dateB, dateE, timeB, timeE, himIds, operators, categories
	// 		// todo: channels, companies, metas, himcategory, poly, searchmode
	// 		// todo: minprio, maxprio
	// 	})
	// 	return ctx.res
	// }

	// todo: fails with 404
	// const dataInfo = async () => {
	// 	const ctx = await request('datainfo', opt)
	// 	return ctx.res
	// }

	const client = {
		locations, nearby,
		departures, arrivals,
		journeys, trip, tripAlternatives,
	}
	Object.defineProperty(client, 'profile', {value: profile})
	return client
}

module.exports = createRestClient
