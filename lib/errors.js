'use strict'

const ACCESS_DENIED = 'ACCESS_DENIED'
const INVALID_REQUEST = 'INVALID_REQUEST'
const NOT_FOUND = 'NOT_FOUND'
const SERVER_ERROR = 'SERVER_ERROR'

// https://gist.github.com/derhuerst/79d49c0f04c1c192a5d15756e5af575f/edit
// todo:
// `code: 'METHOD_NA', message: 'HCI Service: service method disabled'`
const errorsByCode = Object.assign(Object.create(null), {
	H_UNKNOWN: {
		isServer: false,
		code: SERVER_ERROR,
		message: 'unknown internal error',
		statusCode: 500,
	},
	AUTH: {
		isClient: true,
		code: ACCESS_DENIED,
		message: 'invalid or missing authentication data',
		statusCode: 401
	},
	R0001: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'unknown method',
		statusCode: 400
	},
	R0002: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'invalid or missing request parameters',
		statusCode: 400
	},
	R0007: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'internal communication error',
		statusCode: 500
	},
	R5000: {
		isClient: true,
		code: ACCESS_DENIED,
		message: 'access denied',
		statusCode: 401
	},
	S1: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search: a connection to the backend server couldn\'t be established',
		statusCode: 503
	},
	LOCATION: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'location/stop not found',
		statusCode: 400
	},
	H390: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: origin/destination replaced',
		statusCode: 400
	},
	H410: {
		// todo: or is it a client error?
		// todo: statusCode?
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search: incomplete response due to timetable change'
	},
	H455: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: prolonged stop',
		statusCode: 400
	},
	H460: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: stop(s) passed multiple times',
		statusCode: 400
	},
	H500: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: too many trains, connection is not complete',
		statusCode: 400
	},
	H890: {
		isClient: true,
		code: NOT_FOUND,
		message: 'journeys search unsuccessful',
		statusCode: 404
	},
	H891: {
		isClient: true,
		code: NOT_FOUND,
		message: 'journeys search: no route found, try with an intermediate stations',
		statusCode: 404
	},
	H892: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: query too complex, try less intermediate stations',
		statusCode: 400
	},
	H895: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: origin & destination are too near',
		statusCode: 400
	},
	H899: {
		// todo: or is it a client error?
		// todo: statusCode?
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search unsuccessful or incomplete due to timetable change'
	},
	H900: {
		// todo: or is it a client error?
		// todo: statusCode?
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search unsuccessful or incomplete due to timetable change'
	},
	H9220: {
		isClient: true,
		code: NOT_FOUND,
		message: 'journeys search: no stations found close to the address',
		statusCode: 400
	},
	H9230: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search: an internal error occured',
		statusCode: 500
	},
	H9240: {
		isClient: true,
		code: NOT_FOUND,
		message: 'journeys search unsuccessful',
		statusCode: 404
	},
	H9250: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'journeys search: leg query interrupted',
		statusCode: 500
	},
	H9260: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: unknown origin',
		statusCode: 400
	},
	H9280: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: unknown change/via station',
		statusCode: 400
	},
	H9300: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: unknown destination',
		statusCode: 400
	},
	H9320: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: the input is incorrect or incomplete',
		statusCode: 400
	},
	H9360: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: invalid date/time',
		statusCode: 400
	},
	H9380: {
		isClient: true,
		code: INVALID_REQUEST,
		message: 'journeys search: origin/destination/via defined more than once',
		statusCode: 400
	},
	SQ001: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'no departures/arrivals data available',
		statusCode: 503
	},
	SQ005: {
		isClient: true,
		code: NOT_FOUND,
		message: 'no trips found',
		statusCode: 404
	},
	TI001: {
		isServer: true,
		code: SERVER_ERROR,
		message: 'no trip info available',
		statusCode: 503
	}
})

module.exports = errorsByCode
