'use strict'

const request = require('../lib/request')

const formatStationBoardReq = require('../format/station-board-req')
const formatLocationsReq = require('../format/locations-req')
const formatStopReq = require('../format/stop-req')
const formatNearbyReq = require('../format/nearby-req')
const formatTripReq = require('../format/trip-req')
const formatRadarReq = require('../format/radar-req')
const formatReachableFromReq = require('../format/reachable-from-req')
const formatRefreshJourneyReq = require('../format/refresh-journey-req')
const formatRemarksReq = require('../format/remarks-req')
const formatLinesReq = require('../format/lines-req')

const parseDateTime = require('../parse/date-time')
const parsePlatform = require('../parse/platform')
const parseProductsBitmask = require('../parse/products-bitmask')
const parseIcon = require('../parse/icon')
const parseWhen = require('../parse/when')
const parseDeparture = require('../parse/departure')
const parseArrival = require('../parse/arrival')
const parseTrip = require('../parse/trip')
const parseJourneyLeg = require('../parse/journey-leg')
const parseJourney = require('../parse/journey')
const parseLine = require('../parse/line')
const parseLocation = require('../parse/location')
const parseCommon = require('../parse/common')
const parsePolyline = require('../parse/polyline')
const parseMovement = require('../parse/movement')
const parseNearby = require('../parse/nearby')
const parseOperator = require('../parse/operator')
const parseHint = require('../parse/hint')
const parseWarning = require('../parse/warning')
const parseStopover = require('../parse/stopover')
const parseSubscription = require('../parse/subscription')

const formatAddress = require('../format/address')
const formatCoord = require('../format/coord')
const formatDate = require('../format/date')
const formatLocationFilter = require('../format/location-filter')
const formatProductsFilter = require('../format/products-filter')
const formatPoi = require('../format/poi')
const formatStation = require('../format/station')
const formatTime = require('../format/time')
const formatLocation = require('../format/location')
const formatRectangle = require('../format/rectangle')
const filters = require('../format/filters')

const id = (ctx, x) => x

const defaultProfile = {
	request,
	transformReqBody: id,
	transformReq: id,
	salt: null,
	addChecksum: false,
	addMicMac: false,

	formatStationBoardReq,
	formatLocationsReq,
	formatStopReq,
	formatNearbyReq,
	formatTripReq,
	formatRadarReq,
	formatReachableFromReq,
	formatRefreshJourneyReq,
	formatRemarksReq,
	formatLinesReq,
	transformJourneysQuery: id,

	parseDateTime,
	parsePlatform,
	parseProductsBitmask,
	parseIcon,
	parseWhen,
	parseDeparture,
	parseArrival,
	parseTrip,
	parseJourneyLeg,
	parseJourney,
	parseLine,
	parseStationName: (_, name) => name,
	parseLocation,
	parseCommon,
	parsePolyline,
	parseMovement,
	parseNearby,
	parseOperator,
	parseHint,
	parseWarning,
	parseStopover,
	parseSubscription,

	formatAddress,
	formatCoord,
	formatDate,
	formatLocationFilter,
	formatProductsFilter,
	formatPoi,
	formatStation,
	formatTime,
	formatLocation,
	formatRectangle,
	filters,

	journeysOutFrwd: true,  // `journeys()` method: support for `outFrwd` field?
	departuresGetPasslist: true, // `departures()` method: support for `getPasslist` field?
	departuresStbFltrEquiv: true, // `departures()` method: support for `stbFltrEquiv` field?
	trip: false,
	radar: false,
	refreshJourney: true,
	// refreshJourney(): use `outReconL[]` instead of `ctxRecon`?
	refreshJourneyUseOutReconL: false,
	tripsByName: true,
	remarks: true,
	remarksGetPolyline: true, // `remarks()` method: support for `getPolyline` field?
	lines: true,
}

module.exports = defaultProfile
