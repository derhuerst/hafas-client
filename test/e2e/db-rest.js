'use strict'

const tapePromise = require('tape-promise').default
const tape = require('tape')
const isRoughlyEqual = require('is-roughly-equal')

const {createWhen} = require('./lib/util')
const createRestClient = require('../../rest-exe')
const products = require('../../p/db/products')
const {
	stop: createValidateStop,
	station: createValidateStation,
	journeyLeg: createValidateJourneyLeg,
} = require('./lib/validators')
const createValidate = require('./lib/validate-fptf-with')
const testJourneysStationToStation = require('./lib/journeys-station-to-station')
const testJourneysStationToAddress = require('./lib/journeys-station-to-address')
const testJourneysStationToPoi = require('./lib/journeys-station-to-poi')
// const testEarlierLaterJourneys = require('./lib/earlier-later-journeys')
// const testLegCycleAlternatives = require('./lib/leg-cycle-alternatives')
// const testRefreshJourney = require('./lib/refresh-journey')
// const journeysFailsWithNoProduct = require('./lib/journeys-fails-with-no-product')
const testDepartures = require('./lib/departures')
const testDeparturesInDirection = require('./lib/departures-in-direction')
// const testDeparturesWithoutRelatedStations = require('./lib/departures-without-related-stations')
const testArrivals = require('./lib/arrivals')
// const testJourneysWithDetour = require('./lib/journeys-with-detour')
// const testReachableFrom = require('./lib/reachable-from')

const test = tapePromise(tape)

const when = createWhen('Europe/Berlin', 'de-DE')

const token = process.env.TOKEN
const client = createRestClient({
	endpoint: 'https://demo.hafas.de/db-vendo/restproxy/'
}, token, 'public-transport/hafas-client:test')

const cfg = {
	when,
	products: client.profile.products
}

// todo: use Object.fromEntries (Node 12+)
const fakeProducts = client.profile.products
.reduce((ps, p) => ({...ps, [p.id]: !!p.default}), {})
const withFakeProduts = (fn) => (validate, item, name) => {
	fn(validate, {products: fakeProducts, ...item}, name)
}

const _validateJourneyLeg = createValidateJourneyLeg(cfg)
const validateJourneyLeg = (validate, l, name) => {
	_validateJourneyLeg(validate, {
		...l,
		direction: l.direction || 'foo'
	}, name)
}

const validate = createValidate(cfg, {
	stop: withFakeProduts(createValidateStop(cfg)),
	station: withFakeProduts(createValidateStation(cfg)),
	journeyLeg: validateJourneyLeg,
})

const berlinHbf = '8011160'
const münchenHbf = '8000261'
const jungfernheide = '8011167'
const blnSchwedterStr = '732652'
const westhafen = '8089116'
const wedding = '8089131'
const württembergallee = '731084'
const regensburgHbf = '8000309'
const blnOstbahnhof = '8010255'
const blnTiergarten = '8089091'
const blnJannowitzbrücke = '8089019'
const potsdamHbf = '8012666'

test('journeys – Berlin Schwedter Str. to München Hbf', async (t) => {
	const journeys = await client.journeys(blnSchwedterStr, münchenHbf, {
		results: 4,
		departure: when,
		stopovers: true
	})
	console.error(journeys[0].legs)

	await testJourneysStationToStation({
		test: t,
		res: {journeys},
		validate,
		fromId: blnSchwedterStr,
		toId: münchenHbf
	})
	// todo: find a journey where there pricing info is always available
	for (const journey of journeys) {
		if (journey.price) assertValidPrice(t, journey.price)
	}

	t.end()
})

// todo: journeys, only one product

test('Berlin Schwedter Str. to Torfstraße 17', async (t) => {
	const torfstr = {
		type: 'location',
		address: 'Torfstraße 17',
		latitude: 52.5416823,
		longitude: 13.3491223
	}
	const journeys = await client.journeys(blnSchwedterStr, torfstr, {
		results: 3,
		departure: when
	})

	await testJourneysStationToAddress({
		test: t,
		res: {journeys},
		validate,
		fromId: blnSchwedterStr,
		to: torfstr
	})
	t.end()
})

test('Berlin Schwedter Str. to ATZE Musiktheater', async (t) => {
	const atze = {
		type: 'location',
		id: '991598902',
		poi: true,
		name: 'ATZE Musiktheater',
		latitude: 52.542417,
		longitude: 13.350437
	}
	const journeys = await client.journeys(blnSchwedterStr, atze, {
		results: 3,
		departure: when
	})
	console.error(journeys.flatMap(j => j.legs.flatMap(l => l.destination)))

	await testJourneysStationToPoi({
		test: t,
		res: {journeys},
		validate,
		fromId: blnSchwedterStr,
		to: atze
	})
	t.end()
})

// test('earlier/later journeys, Jungfernheide -> München Hbf', async (t) => {
// 	await testEarlierLaterJourneys({
// 		test: t,
// 		fetchJourneys: client.journeys,
// 		validate,
// 		fromId: jungfernheide,
// 		toId: münchenHbf,
// 		when
// 	})

// 	t.end()
// })

test('departures at Berlin Schwedter Str.', async (t) => {
	const departures = await client.departures(blnSchwedterStr, {
		duration: 5, when,
		stopovers: true
	})
	console.error(departures[0])

	await testDepartures({
		test: t,
		departures,
		validate,
		id: blnSchwedterStr
	})
	t.end()
})

test('departures at Berlin Hbf in direction of Berlin Ostbahnhof', async (t) => {
	await testDeparturesInDirection({
		test: t,
		fetchDepartures: client.departures,
		fetchTrip: client.trip,
		id: berlinHbf,
		directionIds: [blnOstbahnhof, '8089185', '732676'],
		when,
		validate
	})
	t.end()
})

test('arrivals at Berlin Schwedter Str.', async (t) => {
	const arrivals = await client.arrivals(blnSchwedterStr, {
		duration: 5, when,
		stopovers: true
	})

	await testArrivals({
		test: t,
		arrivals,
		validate,
		id: blnSchwedterStr
	})
	t.end()
})

test.only('nearby Berlin Jungfernheide', async (t) => {
	const nearby = await client.nearby({
		type: 'location',
		latitude: 52.530273,
		longitude: 13.299433
	}, {
		results: 2, distance: 400
	})

	validate(t, nearby, 'locations', 'nearby')

	t.equal(nearby.length, 2)

	const s0 = nearby[0]
	t.equal(s0.id, jungfernheide)
	t.equal(s0.name, 'Berlin Jungfernheide')
	t.ok(isRoughlyEqual(.0005, s0.location.latitude, 52.530408))
	t.ok(isRoughlyEqual(.0005, s0.location.longitude, 13.299424))
	t.ok(s0.distance >= 0)
	t.ok(s0.distance <= 100)

	t.end()
})

// test('locations named Jungfernheide', async (t) => {
// 	const locations = await client.locations('Jungfernheide', {
// 		results: 10
// 	})

// 	validate(t, locations, 'locations', 'locations')
// 	t.ok(locations.length <= 10)
// 	t.ok(locations.some((l) => {
// 		return l.station && l.station.id === jungfernheide || l.id === jungfernheide
// 	}), 'Jungfernheide not found')

// 	t.end()
// })

// test('stop', async (t) => {
// 	const s = await client.stop(regensburgHbf)

// 	validate(t, s, ['stop', 'station'], 'stop')
// 	t.equal(s.id, regensburgHbf)

// 	t.end()
// })

// test('line with additionalName', async (t) => {
// 	const departures = await client.departures(potsdamHbf, {
// 		duration: 12 * 60, // 12 minutes
// 		products: {bus: false, suburban: false, tram: false}
// 	})
// 	t.ok(departures.some(d => d.line && d.line.additionalName))
// 	t.end()
// })

// test.skip('radar', async (t) => {
// 	const vehicles = await client.radar({
// 		north: 52.52411,
// 		west: 13.41002,
// 		south: 52.51942,
// 		east: 13.41709
// 	}, {
// 		duration: 5 * 60, when
// 	})

// 	validate(t, vehicles, 'movements', 'vehicles')
// 	t.end()
// })

// test('reachableFrom', async (t) => {
// 	const torfstr17 = {
// 		type: 'location',
// 		address: 'Torfstraße 17',
// 		latitude: 52.5416823,
// 		longitude: 13.3491223
// 	}

// 	await testReachableFrom({
// 		test: t,
// 		reachableFrom: client.reachableFrom,
// 		address: torfstr17,
// 		when,
// 		maxDuration: 15,
// 		validate
// 	})
// 	t.end()
// })
