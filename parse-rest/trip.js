'use strict'

const sortBy = require('lodash/sortBy')
const last = require('lodash/last')
const pick = require('lodash/pick')

const parseTrip = (ctx, t) => {
	const {profile} = ctx

	const product = t.products && t.products[0] && t.products[0].Product
	const direction = t.directions && t.directions[0] && t.directions[0].value

	const stopovers = sortBy(t.stops, 'routeIdx')
	.map(st => profile.parseStopover(ctx, st))
	const dep = stopovers[0]
	const arr = last(stopovers)

	return {
		id: t.ref || null,

		origin: dep.stop,
		destination: arr.stop,
		line: product ? profile.parseLine(ctx, product) : null,
		direction: direction || null,

		...pick(dep, [
			'departure',
			'plannedDeparture',
			'departureDelay',
			'prognosedDeparture'
		]),
		...pick(arr, [
			'arrival',
			'plannedArrival',
			'arrivalDelay',
			'prognosedArrival'
		]),

		stopovers
	}
}

module.exports = parseTrip
