'use strict'
import 'es6-symbol/implement'
const c = {
	NONE: Symbol('no loyaly card'),
	BAHNCARD: Symbol('Bahncard'),
	VORTEILSCARD: Symbol('VorteilsCard'),
	HALBTAXABO: Symbol('HalbtaxAbo'),
	VOORDEELURENABO: Symbol('Voordeelurenabo'),
	SHCARD: Symbol('SH-Card'),
	GENERALABONNEMENT: Symbol('General-Abonnement')
}

// see https://gist.github.com/juliuste/202bb04f450a79f8fa12a2ec3abcd72d
const formatLoyaltyCard = (data) => {
	if (data.type === c.BAHNCARD) {
		if (data.discount === 25) return c.class === 1 ? 1 : 2
		if (data.discount === 50) return c.class === 1 ? 3 : 4
	}
	if (data.type === c.VORTEILSCARD) return 9
	if (data.type === c.HALBTAXABO) return data.railplus ? 10 : 11
	if (data.type === c.VOORDEELURENABO) return data.railplus ? 12 : 13
	if (data.type === c.SHCARD) return 14
	if (data.type === c.GENERALABONNEMENT) return 15
	return 0
}

module.exports = {
	data: c,
	format: formatLoyaltyCard
}
