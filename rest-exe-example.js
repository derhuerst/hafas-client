'use strict'

const createClient = require('./rest-exe')

const TOKEN = process.env.TOKEN
if (!TOKEN) throw new Error('missing TOKEN env var')

const profile = {
	endpoint: 'https://demo.hafas.de/db-vendo/restproxy/',
}

const {
	locations, nearby,
	departures, arrivals,
	journeys, trip, tripAlternatives
	// tripHistory,
	// radar,
	// remarks, dataInfo
} = createClient(profile, TOKEN, 'hafas-client example')

const berlinOstkreuz = '8011162'
const berlinSchönefeld = '8010109'
const berlinWestkreuz = '8089047'
const berlinMesseSüd = '8089328'
const berlinYorckstrS1 = '8089051'
const frankfurtHbf = '8000105'
const somewhereInBerlin = {type: 'location', address: 'foo', latitude: 52.51072, longitude: 13.37793}

journeys('8000150', berlinOstkreuz, {
	results: 3,
	stopovers: true,
	remarks: true
})
// .then(journeys => journeys.flatMap(j => [...j.legs, '---']))
// .then(([journey]) => journey.legs.map(l => l.tripId).find(tripId => !!tripId))
// .then(trip)
// .then(tripHistory)
// tripAlternatives()
// trip('1|406543|0|80|2122019')

// locations('hanau hbf')
// nearby({type: 'location', latitude: 52.4751309, longitude: 13.3656537})
// departures(berlinYorckstrS1, {
// 	remarks: true
// })
// .then(deps => deps.map(d => [d.line && d.line.name, d.stop && d.stop.name]))
// arrivals(berlinYorckstrS1, {
// 	remarks: true
// })
// radar({
// 	north: 52.52411,
// 	west: 13.41002,
// 	south: 52.51942,
// 	east: 13.41709
// })
// remarks()
// dataInfo()

.then(data => console.log(require('util').inspect(data, {depth: null, colors: true})))
.catch((err) => {
	console.error(err)
	process.exit(1)
})
