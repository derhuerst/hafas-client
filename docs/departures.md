# `departures(station, [opt])`

`station` must be in one of these formats:

```js
// a station ID, in a format compatible to the profile you use
'900000013102'

// an FPTF `station` object
{
	type: 'station',
	id: '900000013102',
	name: 'foo station',
	location: {
		type: 'location',
		latitude: 1.23,
		longitude: 3.21
	}
}
```

With `opt`, you can override the default options, which look like this:

```js
{
	// todo: products
	when:      new Date(),
	direction: null, // only show departures heading to this station
	duration:  10, // show departures for the next n minutes
	stationLines: false, // parse & expose lines of the station?
	remarks: true, // parse & expose hints & warnings?
	// departures at related stations
	// e.g. those that belong together on the metro map.
	includeRelatedStations: true,
	language: 'en' // language to get results in
}
```

## Response

*Note:* As stated in the [*Friendly Public Transport Format* `1.0.1`](https://github.com/public-transport/friendly-public-transport-format/tree/1.0.1), the `when` field includes the current delay. The `delay` field, if present, expresses how much the former differs from the schedule.

You may pass the `tripId` field into [`trip(id, lineName, [opt])`](trip.md) to get details on the vehicle's trip.

As an example, we're going to use the [VBB profile](../p/vbb):

```js
const createClient = require('hafas-client')
const vbbProfile = require('hafas-client/p/vbb')

const client = createClient(vbbProfile)

// S Charlottenburg
client.departures('900000024101', {duration: 3})
.then(console.log)
.catch(console.error)
```

The response may look like this:

```js
[ {
	tripId: '1|31431|28|86|17122017',
	trip: 31431,
	stop: {
		type: 'station',
		id: '900000024101',
		name: 'S Charlottenburg',
		location: {
			type: 'location',
			latitude: 52.504806,
			longitude: 13.303846
		},
		products: {
			suburban: true,
			subway: false,
			tram: false,
			bus: true,
			ferry: false,
			express: false,
			regional: true
		}
	},
	when: '2017-12-17T19:32:00.000+01:00',
	delay: null
	line: {
		type: 'line',
		id: '18299',
		name: 'S9',
		public: true,
		mode: 'train',
		product: 'suburban',
		symbol: 'S',
		nr: 9,
		metro: false,
		express: false,
		night: false,
		productCode: 0,
		operator: {
			type: 'operator',
			id: 's-bahn-berlin-gmbh',
			name: 'S-Bahn Berlin GmbH'
		}
	},
	direction: 'S Spandau'
}, {
	tripId: '1|30977|8|86|17122017',
	trip: 30977,
	station: { /* … */ },
	when: null,
	delay: null,
	cancelled: true,
	line: {
		type: 'line',
		id: '16441',
		name: 'S5',
		public: true,
		mode: 'train',
		product: 'suburban',
		symbol: 'S',
		nr: 5,
		metro: false,
		express: false,
		night: false,
		productCode: 0,
		operator: { /* … */ }
	},
	direction: 'S Westkreuz'
}, {
	tripId: '1|28671|4|86|17122017',
	trip: 28671,
	stop: { /* … */ },
	when: '2017-12-17T19:35:00.000+01:00',
	delay: 0,
	line: {
		type: 'line',
		id: '19494',
		name: 'U7',
		public: true,
		mode: 'train',
		product: 'subway',
		symbol: 'U',
		nr: 7,
		metro: false,
		express: false,
		night: false,
		productCode: 1,
		operator: { /* … */ }
	},
	direction: 'U Rudow'
} ]
```
