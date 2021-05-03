'use strict'

const isRoughlyEqual = require('is-roughly-equal')

const {createWhen} = require('./lib/util')
const createClient = require('../..')
const vrnProfile = require('../../p/vrn')
const products = require('../../p/vrn/products')
const createValidate = require('./lib/validate-fptf-with')
const {test} = require('./lib/util')
const testJourneysStationToStation = require('./lib/journeys-station-to-station')
const journeysFailsWithNoProduct = require('./lib/journeys-fails-with-no-product')
const testJourneysStationToAddress = require('./lib/journeys-station-to-address')
const testJourneysStationToPoi = require('./lib/journeys-station-to-poi')
const testEarlierLaterJourneys = require('./lib/earlier-later-journeys')
const testDepartures = require('./lib/departures')
const testDeparturesInDirection = require('./lib/departures-in-direction')
const testArrivals = require('./lib/arrivals')

const when = createWhen('Europe/Berlin', 'de-DE')

const cfg = {
	when,
	// stationCoordsOptional: false,
	products,
	minLatitude: 48.462,
	minLongitude: 6.163,
	maxLatitude: 50.440,
	maxLongitude: 10.701,
}

const validate = createValidate(cfg, {})

const client = createClient(vrnProfile, 'public-transport/hafas-client:test')

const ludwigshafen = '8000236'
const meckesheim = '8003932'

test('journeys – Ludwigshafen to Meckesheim', async (t) => {
	const res = await client.journeys(ludwigshafen, meckesheim, {
		results: 4,
		departure: when,
		stopovers: true
	})

	await testJourneysStationToStation({
		test: t,
		res,
		validate,
		fromId: ludwigshafen,
		toId: meckesheim
	})
	t.end()
})

// todo: journeys, only one product

test('journeys – fails with no product', (t) => {
	journeysFailsWithNoProduct({
		test: t,
		fetchJourneys: client.journeys,
		fromId: ludwigshafen,
		toId: meckesheim,
		when,
		products
	})
	t.end()
})

test('Ludwigshafen to Pestalozzistr. 2, Ludwigshafen', async (t) => {
	const pestalozzistr2 = {
		type: 'location',
		id: '980787337',
		address: 'Ludwigshafen am Rhein - Mitte, Pestalozzistraße 2',
		latitude: 49.474336, longitude: 8.441779,
	}

	const res = await client.journeys(ludwigshafen, pestalozzistr2, {
		results: 3,
		departure: when
	})

	await testJourneysStationToAddress({
		test: t,
		res,
		validate,
		fromId: ludwigshafen,
		to: pestalozzistr2
	})
	t.end()
})

test('Ludwigshafen to Südwest-Stadion', async (t) => {
	const südweststadion = {
		type: 'location',
		id: '991664983',
		poi: true,
		name: 'Ludwigshafen am Rhein, Südwest-Stadion (Sport)',
		latitude: 49.469248, longitude: 8.440691,
	}
	const res = await client.journeys(ludwigshafen, südweststadion, {
		results: 3,
		departure: when
	})

	await testJourneysStationToPoi({
		test: t,
		res,
		validate,
		fromId: ludwigshafen,
		to: südweststadion
	})
	t.end()
})

// todo: via works – with detour
// todo: via works – without detour

test('earlier/later journeys', async (t) => {
	await testEarlierLaterJourneys({
		test: t,
		fetchJourneys: client.journeys,
		validate,
		fromId: ludwigshafen,
		toId: meckesheim,
		when
	})

	t.end()
})

test('trip details', async (t) => {
	const res = await client.journeys(ludwigshafen, meckesheim, {
		results: 1, departure: when
	})

	const p = res.journeys[0].legs.find(l => !l.walking)
	t.ok(p.tripId, 'precondition failed')
	t.ok(p.line.name, 'precondition failed')
	const trip = await client.trip(p.tripId, p.line.name, {when})

	validate(t, trip, 'trip', 'trip')
	t.end()
})

test('departures at Meckesheim', async (t) => {
	const departures = await client.departures(meckesheim, {
		duration: 3 * 60, when,
	})

	await testDepartures({
		test: t,
		departures,
		validate,
		id: meckesheim
	})
	t.end()
})

test('departures at Meckesheim in direction of Reilsheim', async (t) => {
	const reilsheim = '8005015'
	await testDeparturesInDirection({
		test: t,
		fetchDepartures: client.departures,
		fetchTrip: client.trip,
		id: meckesheim,
		directionIds: [reilsheim],
		when, duration: 30 * 60,
		validate,
	})
	t.end()
})

test('arrivals at Meckesheim', async (t) => {
	const arrivals = await client.arrivals(meckesheim, {
		duration: 3 * 60, when
	})

	await testArrivals({
		test: t,
		arrivals,
		validate,
		id: meckesheim
	})
	t.end()
})

// todo: nearby

test('locations named Ebertpark', async (t) => {
	const ebertpark = '506453'
	const locations = await client.locations('Ebertpark', {
		results: 20
	})

	validate(t, locations, 'locations', 'locations')
	t.ok(locations.length <= 20)

	t.ok(locations.find(s => s.type === 'stop' || s.type === 'station'))
	t.ok(locations.find(s => s.poi)) // POIs
	t.ok(locations.some((l) => {
		return l.station && l.station.id === ebertpark || l.id === ebertpark
	}))

	t.end()
})

test('station Meckesheim', async (t) => {
	const s = await client.stop(meckesheim)

	validate(t, s, ['stop', 'station'], 'station')
	t.equal(s.id, meckesheim)

	t.end()
})

test('radar', async (t) => {
	const vehicles = await client.radar({
		north: 49.4940,
		west: 8.4560,
		south: 49.4774,
		east: 8.4834,
	}, {
		duration: 5 * 60, when, results: 10,
	})

	validate(t, vehicles, 'movements', 'vehicles')
	t.end()
})

test('subscribing to a journey works', async (t) => {
	const {journeys} = await client.journeys(ludwigshafen, meckesheim, {
		departure: when, results: 1,
	})
	const journey = journeys[0]
	const channelId = 'some-channel'

	const userId = await client.createSubscriptionsUser([channelId])
	t.equal(typeof userId, 'string')
	t.ok(userId)
	t.deepEqual(await client.subscriptions(userId), [])

	const subId = await client.subscribeToJourney(userId, [channelId], journey.refreshToken)
	t.ok(subId !== undefined && subId !== null, 'subId')

	const {
		subscription: sub, rtEvents, himEvents,
	} = await client.subscription(userId, subId, {activeDays: true})
	t.ok(sub)
	t.equal(sub.id, subId)
	t.deepEqual(sub.hysteresis, {minDeviationInterval: 1, notificationStart: 30})
	t.deepEqual(sub.monitorFlags, ['AF', 'DF', 'DV', 'FTF', 'OF', 'PF'])
	t.ok(Array.isArray(sub.connectionInfo))
	t.ok(sub.connectionInfo.length > 0)
	t.equal(sub.journeyRefreshToken, journey.refreshToken)
	t.ok(sub.activeDays)
	t.ok(Array.isArray(rtEvents))
	t.ok(Array.isArray(himEvents))

	const subs = await client.subscriptions(userId)
	t.deepEqual(subs, [{
		id: subId,
		status: 'ACTIVE',
		channels: [{id: channelId}],
		journeyRefreshToken: journey.refreshToken,
	}])

	await client.unsubscribe(userId, subId)
	t.deepEqual(await client.subscriptions(userId), [])

	t.end()
})
