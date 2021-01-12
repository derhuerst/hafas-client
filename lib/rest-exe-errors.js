'use strict'

const ACCESS_DENIED = 'ACCESS_DENIED'
const INVALID_REQUEST = 'INVALID_REQUEST'
const NOT_FOUND = 'NOT_FOUND'
const SERVER_ERROR = 'SERVER_ERROR'

const invalidReq = {
	isClient: true,
	code: INVALID_REQUEST,
	statusCode: 400,
}
const notFound = {
	isClient: true,
	code: NOT_FOUND,
	statusCode: 404,
}
const serverError = {
	isClient: false,
	code: SERVER_ERROR,
	statusCode: 500,
}

// HAFAS ReST API documentation 1.23.30 (06.06.2019)
const errorsByCode = Object.assign(Object.create(null), {
	API_AUTH: {
		isClient: true,
		code: ACCESS_DENIED,
		message: 'invalid or missing authentication data',
		statusCode: 401
	},
	API_QUOTA: {
		isClient: true,
		code: ACCESS_DENIED,
		message: 'quota exceeded for API key',
		statusCode: 429
	},
	API_PARAM: {
		...invalidReq,
		message: 'parameter missing or invalid' // todo: use HAFAS message
	},
	API_FORMAT: {
		...invalidReq,
		message: 'requested response format not supported',
		statusCode: 406
	},
	SVC_PARAM: {
		...invalidReq,
		message: 'parameter missing or invalid' // todo: use HAFAS message
	},
	SVC_LOC: {
		...invalidReq,
		message: 'location missing or invalid',
	},
	SVC_LOC_ARR: {
		...invalidReq,
		message: 'destination location missing or invalid',
	},
	SVC_LOC_DEP: {
		...invalidReq,
		message: 'origin location missing or invalid',
	},
	SVC_LOC_VIA: {
		...invalidReq,
		message: 'change/via location missing or invalid',
	},
	SVC_LOC_EQUAL: {
		...invalidReq,
		message: 'origin & destination locations are equal',
	},
	SVC_LOC_NEAR: {
		...invalidReq,
		message: 'origin & destination are too near',
	},
	SVC_DATATIME: {
		...invalidReq,
		message: 'date/time missing or invalid',
	},
	SVC_DATATIME_PERIOD: {
		...invalidReq,
		message: 'date/time not in the timetable data or not allowed',
	},
	SVC_PROD: {
		...invalidReq,
		message: 'products fields missing or invalid',
	},
	SVC_CTX: {
		...invalidReq,
		message: 'context invalid',
	},
	SVC_FAILED_SEARCH: {
		...NOT_FOUND,
		message: 'search unsuccessful',
	},
	SVC_NO_RESULT: {
		...notFound,
		message: 'no results found',
	},
	SVC_NO_MATCH: {
		...notFound,
		message: 'no match found',
	},
	INT_ERR: {
		...serverError,
		message: 'internal error',
	},
	SOT_AT_DEST: {
		...invalidReq,
		message: 'trip already arrived',
	},
	SOT_BEFORE_START: {
		...invalidReq,
		message: 'trip hasn\'t started yet',
	},
	SOT_CANCELLED: {
		...invalidReq,
		message: 'trip is cancelled',
	}
})

module.exports = errorsByCode
