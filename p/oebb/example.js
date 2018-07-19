'use strict'

const createClient = require('../..')
const oebbProfile = require('.')

const client = createClient(oebbProfile, 'hafas-client-example')

// Wien Westbahnhof to Salzburg Hbf
client.journeys('1291501', '8100002', {results: 1})
// client.departures('8100002', {duration: 1})
// client.arrivals('8100002', {duration: 10, stationLines: true})
// client.locations('Salzburg', {results: 2})
// client.station('8100173') // Graz Hbf
// client.nearby({
// 	type: 'location',
// 	latitude: 47.812851,
// 	longitude: 13.045604
// }, {distance: 60})
// client.radar({
// 	north: 47.827203,
// 	west: 13.001261,
// 	south: 47.773278,
// 	east: 13.07562
// }, {results: 10})

.then((data) => {
	console.log(require('util').inspect(data, {depth: null}))
})
.catch(console.error)
