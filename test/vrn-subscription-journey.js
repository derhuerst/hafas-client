'use strict'

const test = require('tape')

const createClient = require('..')
const rawProfile = require('../p/vrn')
const res = require('./fixtures/vrn-subscription-journey.json')
const expected = require('./fixtures/vrn-subscription-journey.js')

const client = createClient(rawProfile, 'public-transport/hafas-client:test')
const {profile} = client

const opt = {
	stopovers: true,
	tickets: true,
	polylines: true,
	remarks: true,
	scheduledDays: false,
}

test('parses a journey from within a subscription correctly (VRN)', (t) => {
	const common = profile.parseCommon({profile, opt, res: {}})
	const ctx = {profile, opt, common, res}
	const journey = profile.parseJourney(ctx, res)

	t.deepEqual(journey, expected)
	t.end()
})
