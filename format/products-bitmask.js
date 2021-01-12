'use strict'

const isObj = require('lodash/isObject')

const formatProductsBitmask = (ctx, filter) => {
	if (!isObj(filter)) throw new TypeError('products filter must be an object')
	const {profile} = ctx

	const byProduct = Object.create(null)
	const defaultProducts = Object.create(null)
	for (let product of profile.products) {
		byProduct[product.id] = product
		defaultProducts[product.id] = product.default
	}

	filter = Object.assign(Object.create(null), defaultProducts, filter)

	let res = 0
	for (const product in filter) {
		if (filter[product] !== true) continue
		if (!byProduct[product]) throw new TypeError('unknown product ' + product)

		for (const bitmask of byProduct[product].bitmasks) {
			res = res ^ bitmask
		}
	}
	return res
}

module.exports = formatProductsBitmask
