'use strict'

module.exports = {
	id: 'foo',
	hysteresis: {minDeviationInterval: 5, notificationStart: 20},
	monitorFlags: ['AF', 'DF', 'DV', 'FTF', 'OF', 'PF'],
	connectionInfo: [{
		arrivalStation: '8000244',
		arrivalPlatform: '1',
		arrivalStationName: 'Mannheim Hbf',
		arrivalTime: '2020-11-28T18:29:00Z',
		departureStation: '8000156',
		departurePlatform: '4',
		departureStationName: 'Heidelberg Hbf',
		departureTime: '2020-11-28T18:13:00Z',
		productName: 'S 3'
	}],
	journeyRefreshToken: '¶HKI¶T$A=1@O=Heidelberg Hbf@L=8000156@a=128@$A=1@O=Mannheim Hbf@L=8000244@a=128@$202011281813$202011281829$S      3$$1$$$',
	journey: {
		type: 'journey',
		legs: [{
			tripId: '1|225439|0|80|28112020',
			direction: 'Germersheim',
			line: {
				type: 'line',
				id: 's-3',
				fahrtNr: '38352',
				name: 'S 3',
				public: true,
				mode: 'train',
				product: 'urban-train'
			},
			reachable: true,

			origin: {
				type: 'stop',
				id: '8000156',
				name: 'Heidelberg Hbf',
				location: {
					type: 'location',
					id: '8000156',
					latitude: 49.403582,
					longitude: 8.67548
				},
				isMeta: false
			},
			departure: '2020-11-28T20:16:00+01:00',
			plannedDeparture: '2020-11-28T20:13:00+01:00',
			departureDelay: 180,
			departurePlatform: '4',
			plannedDeparturePlatform: '4',

			destination: {
				type: 'stop',
				id: '8000244',
				name: 'Mannheim Hbf',
				location: {
					type: 'location',
					id: '8000244',
					latitude: 49.479181,
					longitude: 8.469268
				},
				isMeta: false
			},
			arrival: '2020-11-28T20:31:00+01:00',
			plannedArrival: '2020-11-28T20:29:00+01:00',
			arrivalDelay: 120,
			arrivalPlatform: '1',
			plannedArrivalPlatform: '1',

			cycle: {min: 600, max: 1200, nr: 9},
			alternatives: [{
				tripId: '1|225210|0|80|28112020',
				line: {
					type: 'line',
					id: 's-2',
					fahrtNr: '38246',
					name: 'S 2',
					public: true,
					mode: 'train',
					product: 'urban-train'
				},
				direction: 'Kaiserslautern Hbf',
				when: '1970-01-01T20:33:00+01:00',
				plannedWhen: '1970-01-01T20:33:00+01:00',
				delay: null
			}, {
				tripId: '1|1204374|0|80|28112020',
				line: {
					type: 'line',
					id: 's-3',
					fahrtNr: '38354',
					name: 'S 3',
					public: true,
					mode: 'train',
					product: 'urban-train'
				},
				direction: 'Bruchsal',
				when: '1970-01-01T20:43:00+01:00',
				plannedWhen: '1970-01-01T20:43:00+01:00',
				delay: null
			}, {
				tripId: '1|225074|0|80|28112020',
				line: {
					type: 'line',
					id: 's-2',
					fahrtNr: '38140',
					name: 'S 2',
					public: true,
					mode: 'train',
					product: 'urban-train'
				},
				direction: 'Kaiserslautern Hbf',
				when: '1970-01-01T21:03:00+01:00',
				plannedWhen: '1970-01-01T21:03:00+01:00',
				delay: null
			}, {
				tripId: '1|225448|0|80|28112020',
				line: {
					type: 'line',
					id: 's-3',
					fahrtNr: '38358',
					name: 'S 3',
					public: true,
					mode: 'train',
					product: 'urban-train'
				},
				direction: 'Germersheim',
				when: '1970-01-01T21:13:00+01:00',
				plannedWhen: '1970-01-01T21:13:00+01:00',
				delay: null
			}, {
				tripId: '1|225213|0|80|28112020',
				line: {
					type: 'line',
					id: 's-2',
					fahrtNr: '38248',
					name: 'S 2',
					public: true,
					mode: 'train',
					product: 'urban-train'
				},
				direction: 'Kaiserslautern Hbf',
				when: '1970-01-01T21:33:00+01:00',
				plannedWhen: '1970-01-01T21:33:00+01:00',
				delay: null
			}],
		}],
		refreshToken: '¶HKI¶T$A=1@O=Heidelberg Hbf@L=8000156@a=128@$A=1@O=Mannheim Hbf@L=8000244@a=128@$202011281813$202011281829$S      3$$1$$$',
	},
}
