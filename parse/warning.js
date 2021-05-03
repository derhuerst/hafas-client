'use strict'

const brToNewline = require('@derhuerst/br2nl')
const omit = require('lodash/omit')

const typesByIcon = Object.assign(Object.create(null), {
	HimWarn: 'status',
	HimInfo: 'status',
})

const parseMsgEdge = (ctx) => (e) => {
	const res = omit(e, [
		'icoX',
		'fLocX', 'fromLocation',
		'tLocX', 'toLocation'
	])
	res.icon = e.icon || null
	// todo: rename `Loc` -> `Location` [breaking]
	res.fromLoc = Array.isArray(e.fromLocations) && e.fromLocations[0] || e.fromLocation || null
	res.toLoc = Array.isArray(e.toLocations) && e.toLocations[0] || e.toLocation || null
	return res
}
const parseMsgEvent = (ctx) => (e) => {
	const {profile} = ctx // todo: test that covers this
	return {
		// todo: rename `Loc` -> `Location` [breaking]
		fromLoc: Array.isArray(e.fromLocations) && e.fromLocations[0] || e.fromLocation || null,
		toLoc: Array.isArray(e.toLocations) && e.toLocations[0] || e.toLocation || null,
		start: profile.parseDateTime(ctx, e.fDate, e.fTime, null),
		end: profile.parseDateTime(ctx, e.tDate, e.tTime, null),
		sections: e.sectionNums || [] // todo: parse
	}
}

const parseWarning = (ctx, w) => {
	const {profile, res: resp, common} = ctx

	// todo: https://github.com/marudor/BahnhofsAbfahrten/blob/46a74957d68edc15713112df44e1a25150f5a178/src/types/HAFAS/HimSearch.ts#L31-L53
	// todo: act, pub, lead, tckr
	// todo: cat (1, 2), pubChL, rRefL/hints, impactL
	// todo: pubChL
	// [ { name: 'timetable',
	// fDate: '20180606',
	// fTime: '073000',
	// tDate: '20180713',
	// tTime: '030000' },
	// { name: 'export',
	// fDate: '20180606',
	// fTime: '073000',
	// tDate: '20180713',
	// tTime: '030000' } ]
	// { name: '1',
	// fDate: '20190219',
	// fTime: '000000',
	// tDate: '20190225',
	// tTime: '120000' }
	// todo: w.regionRefL & res.common.himMsgRegionL

	const icon = w.icon || null
	const type = icon && icon.type && typesByIcon[icon.type] || 'warning'

	const res = {
		id: w.hid || null,
		type,
		summary: w.head ? brToNewline(w.head) : null, // todo: decode HTML entities?
		text: w.text ? brToNewline(w.text) : null, // todo: decode HTML entities?
		icon, // todo: parse icon
		priority: w.prio,
	}
	if ('prod' in w) res.products = profile.parseProductsBitmask(ctx, w.prod)
	if ('comp' in w) res.company = w.comp || null

	// todo: parse to sth meaningful
	if ('cat' in w) res.category = w.cat
	if (w.catRefL && resp.common && resp.common.himMsgCatL) {
		res.categories = w.catRefL
		.map(i => resp.common.himMsgCatL[i])
		.filter(e => !!e)
		.map(cat => cat.id)
	}

	if (w.edgeRefL && resp.common && resp.common.himMsgEdgeL) {
		res.edges = w.edgeRefL
		.map(i => resp.common.himMsgEdgeL[i])
		.filter(e => !!e)
		.map(parseMsgEdge(ctx))
	}
	if (w.eventRefL && resp.common && resp.common.himMsgEventL) {
		res.events = w.eventRefL
		.map(i => resp.common.himMsgEventL[i])
		.filter(e => !!e)
		.map(parseMsgEvent(ctx))
	}

	if (w.affProdRefL) {
		res.affectedLines = w.affProdRefL
		.map(i => common.lines[i])
		.filter(l => !!l)
	}
	if (w.fromLocations) res.fromStops = w.fromLocations
	if (w.toLocations) res.toStops = w.toLocations

	if (w.sDate && w.sTime) res.validFrom = profile.parseDateTime(ctx, w.sDate, w.sTime, null)
	if (w.eDate && w.eTime) res.validUntil = profile.parseDateTime(ctx, w.eDate, w.eTime, null)
	if (w.lModDate && w.lModTime) res.modified = profile.parseDateTime(ctx, w.lModDate, w.lModTime, null)

	return res
}

module.exports = parseWarning
