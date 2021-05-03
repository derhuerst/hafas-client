'use strict'

const slugg = require('slugg')

const parseBitmask = ({profile}, bitmask) => {
	// todo: use profile.products.find() for this
	const byBitmask = []
	for (let product of profile.products) {
		for (let bitmask of product.bitmasks) {
			byBitmask[bitmask] = product
		}
	}

	// todo: what if the bitmask is the sum of two bitmasks?
	return byBitmask[parseInt(bitmask)] || null
}

const parseLine = (ctx, p) => {
	if (!p) return null // todo: handle this upstream

	const prodCtx = p.prodCtx || p.productContext || {}
	const name = p.line || p.addName || p.name || null // wtf
	const res = {
		type: 'line',
		// This is terrible, but FPTF demands an ID. Let's pray for HAFAS.
		id: (
			prodCtx.lineId && slugg(prodCtx.lineId.trim())
			|| name && slugg(name.trim())
			|| null
		),
		// todo: what is p.prodCtx.matchId? use as `id`? expose it.
		fahrtNr: prodCtx.num || null,
		name,
		public: true
	}
	// todo: what is p.number?
	// todo: what is p.prodCtx.catCode?

	if ('string' === typeof prodCtx.admin) {
		res.adminCode = prodCtx.admin.replace(/-+$/, '')
	}

	if ('cls' in p) {
		const {mode, id} = parseBitmask(ctx, parseInt(p.cls)) || {}
		res.mode = mode || null
		res.product = id || null
	} else if (p.productMask && Number.isInteger(p.productMask.integerValue)) {
		const {mode, id} = parseBitmask(ctx, p.productMask.integerValue) || {}
		res.mode = mode || null
		res.product = id || null
	}

	if (p.operator) res.operator = p.operator // todo: move up
	return res
}

module.exports = parseLine
