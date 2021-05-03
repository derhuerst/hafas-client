'use strict'

const findById = (needle) => {
	const needleStopId = needle.id
	const needleStationId = needle.station ? needle.station.id : null

	return (stop) => {
		if (needleStopId === stop.id) return true
		const stationId = stop.station ? stop.station.id : null
		if (needleStationId && stationId && needleStationId === stationId) return true
		// todo: `needleStationId === stop.id`? `needleStopId === stationId`?
		return false
	}
}

const sliceLeg = (leg, from, to) => {
	if (!Array.isArray(leg.stopovers)) throw new Error('leg.stopovers must be an array.')

	const stops = leg.stopovers.map(st => st.stop)
	const fromI = stops.findIndex(findById(from))
	if (fromI === -1) throw new Error('from not found in stopovers')
	const fromStopover = leg.stopovers[fromI]

	const toI = stops.findIndex(findById(to))
	if (toI === -1) throw new Error('to not found in stopovers')
	const toStopover = leg.stopovers[toI]

	if (fromI === 0 && toI === leg.stopovers.length - 1) return leg
	const newLeg = Object.assign({}, leg)
	newLeg.stopovers = leg.stopovers.slice(fromI, toI + 1)

	newLeg.origin = fromStopover.stop
	newLeg.departure = fromStopover.departure
	newLeg.departureDelay = fromStopover.departureDelay
	newLeg.scheduledDeparture = fromStopover.scheduledDeparture
	newLeg.departurePlatform = fromStopover.departurePlatform

	newLeg.destination = toStopover.stop
	newLeg.arrival = toStopover.arrival
	newLeg.arrivalDelay = toStopover.arrivalDelay
	newLeg.scheduledArrival = toStopover.scheduledArrival
	newLeg.arrivalPlatform = toStopover.arrivalPlatform

	return newLeg
}

module.exports = sliceLeg
