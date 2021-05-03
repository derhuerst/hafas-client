'use strict'

const createClient = require('../../')
const dbProfile = require('.')

const client = createClient(dbProfile, 'hafas-client-example')

// Berlin Jungfernheide to München Hbf
client.journeys('8011167', '8000261', {results: 1, tickets: true})
// .then(({journeys}) => {
// 	const leg = journeys[0].legs[0]
// 	return client.trip(leg.tripId, leg.line.name, {polyline: true})
// })
// .then(({journeys}) => {
// 	const [journey] = journeys
// 	return client.refreshJourney(journey.refreshToken, {stopovers: true, remarks: true})
// })

// client.departures('8011167', {duration: 1})
// client.arrivals('8011167', {duration: 10, linesOfStops: true})
// client.locations('Berlin Jungfernheide')
// client.locations('Atze Musiktheater', {poi: true, addressses: false, fuzzy: false})
// client.stop('8000309') // Regensburg Hbf
// client.nearby({
// 	type: 'location',
// 	latitude: 52.4751309,
// 	longitude: 13.3656537
// }, {results: 1})
// client.reachableFrom({
// 	type: 'location',
// 	address: '13353 Berlin-Wedding, Torfstr. 17',
// 	latitude: 52.541797,
// 	longitude: 13.350042
// }, {
// 	when: new Date('2018-08-27T10:00:00+0200'),
// 	maxDuration: 50
// })
// client.radar({
// 	north: 52.52411,
// 	west: 13.41002,
// 	south: 52.51942,
// 	east: 13.41709
// }, {results: 10})

// client.journeys('8011113', '8000261', {
// 	departure: Date.now() - 2 * 60 * 60 * 1000,
// 	results: 1, stopovers: true, transfers: 1
// })
// .then(({journeys}) => {
// 	const leg = journeys[0].legs.find(l => l.line && l.line.product === 'nationalExpress')
// 	const prevStopover = leg.stopovers.find((st) => {
// 		return st.departure && Date.parse(st.departure) < Date.now()
// 	})
// 	return client.journeysFromTrip(leg.tripId, prevStopover, '8000207')
// })

.then((data) => {
	console.log(require('util').inspect(data, {depth: null, colors: true}))
}, console.error)
