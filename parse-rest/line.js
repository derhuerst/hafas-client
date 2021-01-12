'use strict'

const slugg = require('slugg')

const parseLine = (ctx, p) => { // p = line
	const {profile} = ctx

	const name = p.name ? p.name.replace(/\s+/g, ' ') : null
	const res = {
		type: 'line',
		// This is terrible, but FPTF demands an ID.
		id: name && slugg(name.trim()) || null,
		fahrtNr: p.num || null,
		name,
		public: true
	}
	// todo: what is p.catCode?

	// todo: ICEs seem to have a catCode of 0
	const cls = parseInt(p.cls)
	if (!Number.isNaN(cls)) {
		const product = profile.products.find(p => p.bitmasks.includes(cls))
		res.mode = product && product.mode || null
		res.product = product && product.id || null
	}

	if (p.operator) {
		res.operator = {
			type: 'operator',
			id: slugg(p.operator.trim()),
			name: p.operator.trim()
		}
	}

	return res
}

module.exports = parseLine
