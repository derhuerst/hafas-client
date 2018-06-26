'use strict'

const co = require('./co')

const testArrivals = co(function* (cfg) {
	const {test: t, arrivals: arrs, validate, id} = cfg

	validate(t, arrs, 'arrivals', 'arrivals')
	t.ok(arrs.length > 0, 'must be >0 arrivals')
	for (let i = 0; i < arrs.length; i++) {
		const dep = arrs[i]
		const name = `arrs[${i}]`

		t.equal(dep.station.id, id, name + '.station.id is invalid')
	}

	// todo: move into arrivals validator
	t.deepEqual(arrs, arrs.sort((a, b) => t.when > b.when))
})

module.exports = testArrivals
