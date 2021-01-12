'use strict'

const formatProductsFilter = (ctx, filter) => {
	const {profile} = ctx

	const bitmask = profile.formatProductsBitmask(ctx, filter)
	if (bitmask === 0) throw new Error('no products used')

	return {
		type: 'PROD',
		mode: 'INC',
		value: bitmask + ''
	}
}

module.exports = formatProductsFilter
