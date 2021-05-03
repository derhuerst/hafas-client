'use strict'

const isObj = require('lodash/isObject')
const sortBy = require('lodash/sortBy')
const pRetry = require('p-retry')
const omit = require('lodash/omit')
const {v4: uuidV4} = require('uuid')
const {randomBytes} = require('crypto')
const {gunzipSync} = require('zlib')

const defaultProfile = require('./lib/default-profile')
const validateProfile = require('./lib/validate-profile')
const {INVALID_REQUEST} = require('./lib/errors')

const isNonEmptyString = str => 'string' === typeof str && str.length > 0

const validateLocation = (loc, name = 'location') => {
	if (!isObj(loc)) {
		throw new TypeError(name + ' must be an object.')
	} else if (loc.type !== 'location') {
		throw new TypeError('invalid location object.')
	} else if ('number' !== typeof loc.latitude) {
		throw new TypeError(name + '.latitude must be a number.')
	} else if ('number' !== typeof loc.longitude) {
		throw new TypeError(name + '.longitude must be a number.')
	}
}

const validateWhen = (when, name = 'when') => {
	if (Number.isNaN(+when)) {
		throw new TypeError(name + ' is invalid')
	}
}

const createClient = (profile, userAgent, opt = {}) => {
	profile = Object.assign({}, defaultProfile, profile)
	validateProfile(profile)

	if ('string' !== typeof userAgent) {
		throw new TypeError('userAgent must be a string');
	}

	const _stationBoard = (station, type, parse, opt = {}) => {
		if (isObj(station)) station = profile.formatStation(station.id)
		else if ('string' === typeof station) station = profile.formatStation(station)
		else throw new TypeError('station must be an object or a string.')

		if ('string' !== typeof type || !type) {
			throw new TypeError('type must be a non-empty string.')
		}

		if (!profile.departuresGetPasslist && ('stopovers' in opt)) {
			throw new Error('opt.stopovers is not supported by this endpoint')
		}
		if (!profile.departuresStbFltrEquiv && ('includeRelatedStations' in opt)) {
			throw new Error('opt.includeRelatedStations is not supported by this endpoint')
		}

		opt = Object.assign({
			// todo: for arrivals(), this is actually a station it *has already* stopped by
			direction: null, // only show departures stopping by this station
			line: null, // filter by line ID
			duration: 10, // show departures for the next n minutes
			results: null, // max. number of results; `null` means "whatever HAFAS wants"
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			linesOfStops: false, // parse & expose lines at the stop/station?
			remarks: true, // parse & expose hints & warnings?
			stopovers: false, // fetch & parse previous/next stopovers?
			// departures at related stations
			// e.g. those that belong together on the metro map.
			includeRelatedStations: true
		}, opt)
		opt.when = new Date(opt.when || Date.now())
		if (Number.isNaN(+opt.when)) throw new Error('opt.when is invalid')

		const req = profile.formatStationBoardReq({profile, opt}, station, type)

		return profile.request({profile, opt}, userAgent, req)
		.then(({res, common}) => {
			if (!Array.isArray(res.jnyL)) return []

			const ctx = {profile, opt, common, res}
			return res.jnyL.map(res => parse(ctx, res))
			.sort((a, b) => new Date(a.when) - new Date(b.when)) // todo
		})
	}

	const departures = (station, opt = {}) => {
		return _stationBoard(station, 'DEP', profile.parseDeparture, opt)
	}
	const arrivals = (station, opt = {}) => {
		return _stationBoard(station, 'ARR', profile.parseArrival, opt)
	}

	const journeys = (from, to, opt = {}) => {
		from = profile.formatLocation(profile, from, 'from')
		to = profile.formatLocation(profile, to, 'to')

		if (('earlierThan' in opt) && ('laterThan' in opt)) {
			throw new TypeError('opt.earlierThan and opt.laterThan are mutually exclusive.')
		}
		if (('departure' in opt) && ('arrival' in opt)) {
			throw new TypeError('opt.departure and opt.arrival are mutually exclusive.')
		}
		let journeysRef = null
		if ('earlierThan' in opt) {
			if (!isNonEmptyString(opt.earlierThan)) {
				throw new TypeError('opt.earlierThan must be a non-empty string.')
			}
			if (('departure' in opt) || ('arrival' in opt)) {
				throw new TypeError('opt.earlierThan and opt.departure/opt.arrival are mutually exclusive.')
			}
			journeysRef = opt.earlierThan
		}
		if ('laterThan' in opt) {
			if (!isNonEmptyString(opt.laterThan)) {
				throw new TypeError('opt.laterThan must be a non-empty string.')
			}
			if (('departure' in opt) || ('arrival' in opt)) {
				throw new TypeError('opt.laterThan and opt.departure/opt.arrival are mutually exclusive.')
			}
			journeysRef = opt.laterThan
		}

		opt = Object.assign({
			results: null, // number of journeys – `null` means "whatever HAFAS returns"
			via: null, // let journeys pass this station?
			stopovers: false, // return stations on the way?
			transfers: -1, // maximum nr of transfers
			transferTime: 0, // minimum time for a single transfer in minutes
			// todo: does this work with every endpoint?
			accessibility: 'none', // 'none', 'partial' or 'complete'
			bike: false, // only bike-friendly journeys
			walkingSpeed: 'normal', // 'slow', 'normal', 'fast'
			// Consider walking to nearby stations at the beginning of a journey?
			startWithWalking: true,
			tickets: false, // return tickets?
			polylines: false, // return leg shapes?
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			remarks: true, // parse & expose hints & warnings?
			scheduledDays: false
		}, opt)
		if (opt.via) opt.via = profile.formatLocation(profile, opt.via, 'opt.via')

		if (opt.when !== undefined) {
			throw new Error('opt.when is not supported anymore. Use opt.departure/opt.arrival.')
		}
		let when = new Date(), outFrwd = true
		if (opt.departure !== undefined && opt.departure !== null) {
			when = new Date(opt.departure)
			if (Number.isNaN(+when)) throw new TypeError('opt.departure is invalid')
		} else if (opt.arrival !== undefined && opt.arrival !== null) {
			if (!profile.journeysOutFrwd) {
				throw new Error('opt.arrival is unsupported')
			}
			when = new Date(opt.arrival)
			if (Number.isNaN(+when)) throw new TypeError('opt.arrival is invalid')
			outFrwd = false
		}

		const filters = [
			profile.formatProductsFilter({profile}, opt.products || {})
		]
		if (
			opt.accessibility &&
			profile.filters &&
			profile.filters.accessibility &&
			profile.filters.accessibility[opt.accessibility]
		) {
			filters.push(profile.filters.accessibility[opt.accessibility])
		}

		if (!['slow','normal','fast'].includes(opt.walkingSpeed)) {
			throw new Error('opt.walkingSpeed must be one of these values: "slow", "normal", "fast".')
		}
		const gisFltrL = []
		if (profile.journeysWalkingSpeed) {
			gisFltrL.push({
				meta: 'foot_speed_' + opt.walkingSpeed,
				mode: 'FB',
				type: 'M'
			})
		}

		const query = {
			getPasslist: !!opt.stopovers,
			maxChg: opt.transfers,
			minChgTime: opt.transferTime,
			depLocL: [from],
			viaLocL: opt.via ? [{loc: opt.via}] : null,
			arrLocL: [to],
			jnyFltrL: filters,
			gisFltrL,
			getTariff: !!opt.tickets,
			// todo: this is actually "take additional stations nearby the given start and destination station into account"
			// see rest.exe docs
			ushrp: !!opt.startWithWalking,

			getPT: true, // todo: what is this?
			getIV: false, // todo: walk & bike as alternatives?
			getPolyline: !!opt.polylines
			// todo: `getConGroups: false` what is this?
			// todo: what is getEco, fwrd?
		}
		if (journeysRef) query.ctxScr = journeysRef
		else {
			query.outDate = profile.formatDate(profile, when)
			query.outTime = profile.formatTime(profile, when)
		}
		if (opt.results !== null) query.numF = opt.results
		if (profile.journeysOutFrwd) query.outFrwd = outFrwd

		return profile.request({profile, opt}, userAgent, {
			cfg: {polyEnc: 'GPA'},
			meth: 'TripSearch',
			req: profile.transformJourneysQuery({profile, opt}, query)
		})
		.then(({res, common}) => {
			if (!Array.isArray(res.outConL)) return []
			// todo: outConGrpL

			const ctx = {profile, opt, common, res}
			const journeys = res.outConL
			.map(j => profile.parseJourney(ctx, j))

			return {
				earlierRef: res.outCtxScrB,
				laterRef: res.outCtxScrF,
				journeys,
				realtimeDataFrom: res.planrtTS ? parseInt(res.planrtTS) : null,
			}
		})
	}

	const refreshJourney = (refreshToken, opt = {}) => {
		if ('string' !== typeof refreshToken || !refreshToken) {
			throw new TypeError('refreshToken must be a non-empty string.')
		}

		opt = Object.assign({
			stopovers: false, // return stations on the way?
			tickets: false, // return tickets?
			polylines: false, // return leg shapes? (not supported by all endpoints)
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			remarks: true // parse & expose hints & warnings?
		}, opt)

		const req = profile.formatRefreshJourneyReq({profile, opt}, refreshToken)

		return profile.request({profile, opt}, userAgent, req)
		.then(({res, common}) => {
			if (!Array.isArray(res.outConL) || !res.outConL[0]) {
				const err = new Error('invalid response')
				// technically this is not a HAFAS error
				// todo: find a different flag with decent DX
				err.isHafasError = true
				throw err
			}

			const ctx = {profile, opt, common, res}
			return profile.parseJourney(ctx, res.outConL[0])
		})
	}

	const locations = (query, opt = {}) => {
		if (!isNonEmptyString(query)) {
			throw new TypeError('query must be a non-empty string.')
		}
		opt = Object.assign({
			fuzzy: true, // find only exact matches?
			results: 5, // how many search results?
			stops: true, // return stops/stations?
			addresses: true,
			poi: true, // points of interest
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			linesOfStops: false // parse & expose lines at each stop/station?
		}, opt)

		const req = profile.formatLocationsReq({profile, opt}, query)

		return profile.request({profile, opt}, userAgent, req)
		.then(({res, common}) => {
			if (!res.match || !Array.isArray(res.match.locL)) return []

			const ctx = {profile, opt, common, res}
			return res.match.locL.map(loc => profile.parseLocation(ctx, loc))
		})
	}

	const stop = (stop, opt = {}) => {
		if ('object' === typeof stop) stop = profile.formatStation(stop.id)
		else if ('string' === typeof stop) stop = profile.formatStation(stop)
		else throw new TypeError('stop must be an object or a string.')

		opt = Object.assign({
			linesOfStops: false, // parse & expose lines at the stop/station?
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			remarks: true, // parse & expose hints & warnings?
		}, opt)

		const req = profile.formatStopReq({profile, opt}, stop)

		return profile.request({profile, opt}, userAgent, req)
		.then(({res, common}) => {
			if (!res || !Array.isArray(res.locL) || !res.locL[0]) {
				// todo: proper stack trace?
				// todo: DRY with lib/request.js
				const err = new Error('response has no stop')
				// technically this is not a HAFAS error
				// todo: find a different flag with decent DX
				err.isHafasError = true
				err.code = INVALID_REQUEST
				throw err
			}

			const ctx = {profile, opt, res, common}
			return profile.parseLocation(ctx, res.locL[0])
		})
	}

	const nearby = (location, opt = {}) => {
		validateLocation(location, 'location')

		opt = Object.assign({
			results: 8, // maximum number of results
			distance: null, // maximum walking distance in meters
			poi: false, // return points of interest?
			stops: true, // return stops/stations?
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			linesOfStops: false // parse & expose lines at each stop/station?
		}, opt)

		const req = profile.formatNearbyReq({profile, opt}, location)

		return profile.request({profile, opt}, userAgent, req)
		.then(({common, res}) => {
			if (!Array.isArray(res.locL)) return []

			const ctx = {profile, opt, common, res}
			const results = res.locL.map(loc => profile.parseNearby(ctx, loc))
			return Number.isInteger(opt.results) ? results.slice(0, opt.results) : results
		})
	}

	const trip = (id, lineName, opt = {}) => {
		if (!isNonEmptyString(id)) {
			throw new TypeError('id must be a non-empty string.')
		}
		if (!isNonEmptyString(lineName)) {
			throw new TypeError('lineName must be a non-empty string.')
		}
		opt = Object.assign({
			stopovers: true, // return stations on the way?
			polyline: false, // return a track shape?
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			remarks: true // parse & expose hints & warnings?
		}, opt)

		const req = profile.formatTripReq({profile, opt}, id, lineName)

		return profile.request({profile, opt}, userAgent, req)
		.then(({common, res}) => {
			const ctx = {profile, opt, common, res}
			return profile.parseTrip(ctx, res.journey)
		})
	}

	const tripsByName = (lineNameOrFahrtNr, opt = {}) => {
		if (!isNonEmptyString(lineNameOrFahrtNr)) {
			throw new TypeError('lineNameOrFahrtNr must be a non-empty string.')
		}
		opt = Object.assign({
		}, opt)
		opt.when = new Date(opt.when || Date.now())

		return profile.request({profile, opt}, userAgent, {
			cfg: {polyEnc: 'GPA'},
			meth: 'JourneyMatch',
			req: {
				input: lineNameOrFahrtNr,
				// todo: date seems to be ignored
				date: profile.formatDate(profile, opt.when),
				// todo: there are probably more options
			}
		})
		.then(({res, common}) => {
			const ctx = {profile, opt, common, res}
			return res.jnyL.map(t => profile.parseTrip(ctx, t))
		})
	}

	const radar = ({north, west, south, east}, opt) => {
		if ('number' !== typeof north) throw new TypeError('north must be a number.')
		if ('number' !== typeof west) throw new TypeError('west must be a number.')
		if ('number' !== typeof south) throw new TypeError('south must be a number.')
		if ('number' !== typeof east) throw new TypeError('east must be a number.')
		if (north <= south) throw new Error('north must be larger than south.')
		if (east <= west) throw new Error('east must be larger than west.')

		opt = Object.assign({
			results: 256, // maximum number of vehicles
			duration: 30, // compute frames for the next n seconds
			// todo: what happens with `frames: 0`?
			frames: 3, // nr of frames to compute
			products: null, // optionally an object of booleans
			polylines: true, // return a track shape for each vehicle?
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
		}, opt || {})
		opt.when = new Date(opt.when || Date.now())
		if (Number.isNaN(+opt.when)) throw new TypeError('opt.when is invalid')

		const req = profile.formatRadarReq({profile, opt}, north, west, south, east)

		return profile.request({profile, opt}, userAgent, req)
		.then(({res, common}) => {
			if (!Array.isArray(res.jnyL)) return []

			const ctx = {profile, opt, common, res}
			return res.jnyL.map(m => profile.parseMovement(ctx, m))
		})
	}

	const reachableFrom = (address, opt = {}) => {
		validateLocation(address, 'address')

		opt = Object.assign({
			when: Date.now(),
			maxTransfers: 5, // maximum of 5 transfers
			maxDuration: 20, // maximum travel duration in minutes, pass `null` for infinite
			products: {},
			subStops: true, // parse & expose sub-stops of stations?
			entrances: true, // parse & expose entrances of stops/stations?
			polylines: false, // return leg shapes?
		}, opt)
		if (Number.isNaN(+opt.when)) throw new TypeError('opt.when is invalid')

		const req = profile.formatReachableFromReq({profile, opt}, address)

		const refetch = () => {
			return profile.request({profile, opt}, userAgent, req)
			.then(({res, common}) => {
				if (!Array.isArray(res.posL)) {
					const err = new Error('invalid response')
					err.shouldRetry = true
					throw err
				}

				const byDuration = []
				let i = 0, lastDuration = NaN
				for (const pos of sortBy(res.posL, 'dur')) {
					const loc = common.locations[pos.locX]
					if (!loc) continue
					if (pos.dur !== lastDuration) {
						lastDuration = pos.dur
						i = byDuration.length
						byDuration.push({
							duration: pos.dur,
							stations: [loc]
						})
					} else {
						byDuration[i].stations.push(loc)
					}
				}
				return byDuration
			})
		}

		return pRetry(refetch, {
			retries: 3,
			factor: 2,
			minTimeout: 2 * 1000
		})
	}

	const remarks = async (opt = {}) => {
		opt = {
			results: 100, // maximum number of remarks
			// filter by time
			from: Date.now(),
			to: null,
			products: null, // filter by affected products
			polylines: false, // return leg shapes? (not supported by all endpoints)
			...opt
		}

		if (opt.from !== null) {
			opt.from = new Date(opt.from)
			validateWhen(opt.from, 'opt.from')
		}
		if (opt.to !== null) {
			opt.to = new Date(opt.to)
			validateWhen(opt.to, 'opt.to')
		}

		const req = profile.formatRemarksReq({profile, opt})
		const {
			res, common,
		} = await profile.request({profile, opt}, userAgent, req)

		const ctx = {profile, opt, common, res}
		return (res.msgL || [])
		.map(w => profile.parseWarning(ctx, w))
	}

	const lines = async (query, opt = {}) => {
		if (!isNonEmptyString(query)) {
			throw new TypeError('query must be a non-empty string.')
		}

		const req = profile.formatLinesReq({profile, opt}, query)
		const {
			res, common,
		} = await profile.request({profile, opt}, userAgent, req)

		if (!Array.isArray(res.lineL)) return []
		const ctx = {profile, opt, common, res}
		return res.lineL.map(l => {
			const parseDirRef = i => (res.common.dirL[i] || {}).txt || null
			return {
				...omit(l.line, ['id', 'fahrtNr']),
				id: l.lineId,
				// todo: what is locX?
				directions: Array.isArray(l.dirRefL)
					? l.dirRefL.map(parseDirRef)
					: null,
				trips: Array.isArray(l.jnyL)
					? l.jnyL.map(t => profile.parseTrip(ctx, t))
					: null,
			}
		})
	}

	const serverInfo = async (opt = {}) => {
		const {res, common} = await profile.request({profile, opt}, userAgent, {
			meth: 'ServerInfo',
			req: {}
		})

		const ctx = {profile, opt, common, res}
		return {
			timetableStart: res.fpB || null,
			timetableEnd: res.fpE || null,
			serverTime: res.sD && res.sT
				? profile.parseDateTime(ctx, res.sD, res.sT)
				: null,
			realtimeDataUpdatedAt: res.planrtTS
				? parseInt(res.planrtTS)
				: null,
		}
	}

	const _checkSubscriptionsResultCode = (res) => {
		if (!res.result || res.result.resultCode !== 'OK') {
			const err = new Error('unexpected reponse')
			err.res = res
			throw err
		}
	}

	// This HAFAS call seems to be idempotent.
	// user IDs are case-sensitive!
	const createSubscriptionsUser = async (channelIds = [uuidV4()], opt = {}) => {
		if (!Array.isArray(channelIds) || channelIds.length === 0) {
			throw new TypeError('channelIds must be a non-empty array')
		}
		for (let i = 0; i < channelIds.length; i++) {
			if (!isNonEmptyString(channelIds[i])) {
				throw new TypeError(`channelIds[${i}] must be a non-empty string`)
			}
		}

		const pushToken = opt.pushToken || randomBytes(32).toString('hex')
		const channels = channelIds.map((channelId) => ({
			type: 'IPHONE',
			name: 'PUSH_IPHONE',
			address: pushToken,
			channelId,
			options: [
				{type: 'NO_SOUND', value: '1'},
				// todo: move to profiles?
				// {type: 'CUSTOMER_TYPE', value: 'com.deutschebahn.vrn'},
			],
		}))
		const {res} = await profile.request({profile, opt}, userAgent, {
			meth: 'SubscrUserCreate',
			req: {
				userId: opt.userId || uuidV4(),
				language: 'en', // todo: make customizable
				channels,
			},
		})
		_checkSubscriptionsResultCode(res)
		return res.userId
	}

	const subscriptions = async (userId) => {
		if (!isNonEmptyString(userId)) {
			throw new TypeError('userId must be a non-empty string')
		}

		const {res} = await profile.request({profile, opt}, userAgent, {
			meth: 'SubscrSearch',
			req: {
				userId,
			},
		})
		_checkSubscriptionsResultCode(res)

		const parseChannel = (ch) => ({
			id: ch.channelId,
		})
		const parseSubscription = (sub) => ({
			id: sub.subscrId,
			status: sub.status,
			channels: sub.channels.map(parseChannel),
			journeyRefreshToken: sub.ctxRecon,
		})

		if (!Array.isArray(res.conSubscrL)) return []
		return res.conSubscrL.map(parseSubscription)
	}

	const subscription = async (userId, subscriptionId, opt = {}) => {
		if (!isNonEmptyString(userId)) {
			throw new TypeError('userId must be a non-empty string')
		}
		if (subscriptionId === null || subscriptionId === undefined) {
			throw new TypeError('missing subscriptionId')
		}
		opt = {
			journey: false, // parse & expose the subscription's journey?
			...opt,
		}

		const {res, common} = await profile.request({profile, opt}, userAgent, {
			meth: 'SubscrDetails',
			req: {
				userId,
				subscrId: subscriptionId,
			},
		})
		_checkSubscriptionsResultCode(res)
		const ctx = {profile, opt, common, res}

		let journey = null
		if (opt.journey && res.conSubscr.data && res.conSubscr.data.slice(0, 5) === 'GZip:') {
			const gzipped = Buffer.from(res.conSubscr.data.slice(5), 'base64')
			const gunzipped = gunzipSync(gzipped)
			const {
				connection,
				// todo: version, search, cst, checksum
				// todo: reminderOrigin, reminderChange, reminderCheckout, reminderDestination
			} = JSON.parse(gunzipped.toString('utf8'))
			journey = profile.parseJourney(ctx, connection)
		}

		return {
			id: subscriptionId,
			// todo: serviceDays
			hysteresis: res.conSubscr.hysteresis,
			monitorFlags: res.conSubscr.monitorFlags,
			connectionInfo: res.conSubscr.connectionInfo,
			journeyRefreshToken: res.conSubscr.ctxRecon,
			journey,
			// todo: parse & give a proper name
			rtEvents: res.eventHistory && res.eventHistory.rtEvents || null,
			himEvents: res.eventHistory && res.eventHistory.himEvents || null,
		}
	}

	const client = {
		departures,
		arrivals,
		journeys,
		locations,
		stop,
		nearby,
		serverInfo,
	}
	if (profile.trip) client.trip = trip
	if (profile.radar) client.radar = radar
	if (profile.refreshJourney) client.refreshJourney = refreshJourney
	if (profile.reachableFrom) client.reachableFrom = reachableFrom
	if (profile.tripsByName) client.tripsByName = tripsByName
	if (profile.remarks !== false) client.remarks = remarks
	if (profile.lines !== false) client.lines = lines
	if (profile.subscriptions !== false) {
		client.createSubscriptionsUser = createSubscriptionsUser
		client.subscriptions = subscriptions
		client.subscription = subscription
	}
	Object.defineProperty(client, 'profile', {value: profile})
	return client
}

module.exports = createClient
