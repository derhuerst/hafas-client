'use strict'

const test = require('tape')

const createThrottledClient = require('../throttle')
const vbbProfile = require('../p/vbb')

const spichernstr = '900000042101'

test('throttle works', (t) => {
	let calls = 0
	const transformReqBody = (body) => {
		calls++
		return vbbProfile.transformReqBody(body)
	}
	const mockProfile = Object.assign({}, vbbProfile, {transformReqBody})

	const client = createThrottledClient(mockProfile, 2, 1000)
	for (let i = 0; i < 10; i++) client.departures(spichernstr, {duration: 1})

	t.plan(3)
	setTimeout(() => t.equal(calls, 2), 500)
	setTimeout(() => t.equal(calls, 4), 1500)
	setTimeout(() => t.equal(calls, 6), 2500)
})

// todo
