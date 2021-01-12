'use strict'

const test = require('tape')
const format = require('../../format/products-bitmask')

const products = [
	{
		id: 'train',
		bitmasks: [1, 2],
		default: true
	},
	{
		id: 'bus',
		bitmasks: [4],
		default: true
	},
	{
		id: 'tram',
		bitmasks: [8, 32],
		default: false
	},
]

const ctx = {
	common: {},
	opt: {},
	profile: {products}
}

test('formatProductsBitmask works', (t) => {
	t.deepEqual(format(ctx, {}), 1 | 2 | 4)
	t.equal(format(ctx, {bus: true}), 1 | 2 | 4)
	t.equal(format(ctx, {bus: false}), 1 | 2)
	t.equal(format(ctx, {tram: true}), 1 | 2 | 4 | 8 | 32)
	t.end()
})
