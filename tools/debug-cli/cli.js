#!/usr/bin/env node
'use strict'

const mri = require('mri')
const {join} = require('path')
const createClient = require('../..')

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

const toString = val => val + ''
const parseJsObject = val => {
	const res = eval(`(${val})`)
	return res && 'object' === typeof res ? res : {}
}

const parseArgs = [
	['departures', 0, toString],
	['departures', 1, parseJsObject],
	['arrivals', 0, toString],
	['arrivals', 1, parseJsObject],
	['journeys', 0, toString],
	['journeys', 1, toString],
	['journeys', 2, parseJsObject],
	['refreshJourney', 0, toString],
	['refreshJourney', 1, parseJsObject],
	['journeysFromTrip', 0, toString],
	['journeysFromTrip', 1, parseJsObject],
	['journeysFromTrip', 2, toString],
	['journeysFromTrip', 3, parseJsObject],
	['locations', 0, toString],
	['locations', 1, parseJsObject],
	['stop', 0, toString],
	['stop', 1, parseJsObject],
	['nearby', 0, parseJsObject],
	['nearby', 1, parseJsObject],
	['trip', 0, toString],
	['trip', 1, toString],
	['trip', 2, parseJsObject],
	['radar', 0, parseJsObject],
	['radar', 1, parseJsObject],
	['reachableFrom', 0, parseJsObject],
	['reachableFrom', 1, parseJsObject],
	['remarks', 0, parseJsObject],
	['lines', 0, toString],
	['lines', 1, parseJsObject],
	['serverInfo', 0, parseJsObject],
]

const argv = mri(process.argv.slice(2))

const profile = require(join('../../p', argv._[0]))
const client = createClient(profile, 'hafas-client debug CLI')

const fnName = argv._[1]
const fn = client[fnName]

const args = argv._.slice(2).map((arg, i) => {
	const parser = parseArgs.find(([_fnName, _i]) => _fnName === fnName && _i === i)
	return parser ? parser[2](arg) : arg
})

fn(...args)
.then((res) => {
	process.stdout.write(JSON.stringify(res) + '\n')
})
.catch(showError)
