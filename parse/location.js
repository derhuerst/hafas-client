'use strict'

const {parse} = require('qs')
const get = require('lodash/get')

const POI = 'P'
const STATION = 'S'
const ADDRESS = 'A'

const leadingZeros = /^0+/

const parseNr = nr => parseFloat(nr.slice(0, 2) + '.' + nr.slice(2))

// todo: what is l.wt? is it "weight"?
// 	- `6733` for 8013074 with p/vmt
// 	- `3933` for 8012092 with p/vmt
// 	- `2062` for 8010168 with p/vmt
const parseLocation = (ctx, l) => {
	const {profile, opt} = ctx

	const lid = parse(l.lid, {delimiter: '@'})
	const res = {
		type: 'location',
		id: (l.extId || lid.L || lid.b || '').replace(leadingZeros, '') || null,

		latitude: (
			l.crd && 'number' === typeof l.crd.y
			? parseNr(l.crd.y + '')
			: (lid.Y ? parseNr(lid.Y) : null)
		),
		longitude: (
			l.crd && 'number' === typeof l.crd.x
			? parseNr(l.crd.x + '')
			: (lid.X ? parseNr(lid.X) : null)
		),
	}

	if (l.type === STATION) {
		// todo: https://github.com/public-transport/hafas-client/issues/151
		const locL = get(ctx.res, ['common', 'locL'], [])

		const mMastLocX = 'mMastLocX' in l ? l.mMastLocX : NaN
		const subStops = (l.stopLocL || [])
		.filter(locX => locX !== mMastLocX)
		.map(locX => locL[locX])
		.filter(s => !!s)
		.map(s => profile.parseLocation(ctx, s))
		.filter(stop => !!stop)

		const stop = {
			type: l.isMainMast || subStops.length > 0 ? 'station' : 'stop',
			id: res.id,
			name: l.name || lid.O ? profile.parseStationName(ctx, l.name || lid.O) : null,
			location: 'number' === typeof res.latitude ? res : null // todo: remove `.id`
		}
		if (opt.subStops && subStops.length > 0) stop.stops = subStops

		if ('pCls' in l) stop.products = profile.parseProductsBitmask(ctx, l.pCls)
		if ('meta' in l) stop.isMeta = !!l.meta

		const mMastLoc = locL[mMastLocX]
		if (mMastLoc) {
			stop.station = {
				...profile.parseLocation(ctx, mMastLoc),
				type: 'station', // todo: this should be handled differently
			}
		}

		if (opt.entrances) {
			const entrances = (l.entryLocL || [])
			.map(locX => locL[locX])
			.filter(l => !!l)
			.map(l => profile.parseLocation(ctx, l))
			.filter(loc => !!loc)
			.map(loc => loc.location)
			if (entrances.length > 0) stop.entrances = entrances
		}

		if (opt.linesOfStops && Array.isArray(l.lines)) {
			stop.lines = l.lines
		}

		const locHints = (l.remarkRefs || [])
		.filter(ref => !!ref.hint && Array.isArray(ref.tagL))
		.filter(({tagL}) => (
			tagL.includes('RES_LOC') ||
			tagL.find(t => t.slice(0, 8) === 'RES_LOC_') // e.g. `RES_LOC_H3`
		))
		.map(ref => ref.hint)
		const hints = [
			...(l.hints || []),
			...locHints,
		]
		const byType = type => hints.find(h => h.type === type)

		const transitAuthority = (byType('transit-authority') || {}).text
		if (transitAuthority) stop.transitAuthority = transitAuthority

		const dhid = (byType('stop-dhid') || {}).text
		if (dhid) {
			if (!stop.ids) stop.ids = {}
			stop.ids.dhid = dhid
		}

		const otherIds = hints
		.filter(h => h.type === 'foreign-id')
		.filter(h => 'string' === typeof h.text && h.text.includes(':'))
		.map(({text}) => {
			const i = text.indexOf(':')
			return [text.slice(0, i), text.slice(i + 1)]
		})
		.filter(([src]) => src !== 'NULL')
		if (otherIds.length > 0) {
			if (!stop.ids) stop.ids = {}
			for (const [src, id] of otherIds) stop.ids[src] = id
		}

		return stop
	}

	if (l.type === ADDRESS) res.address = l.name
	else res.name = l.name
	if (l.type === POI) res.poi = true

	return res
}

// We use a "visitied list" to prevent endless recursion.
const seen = Symbol('parseLocation seen items')
const parseLocationWithoutCycles = (ctx, l, ...args) => {
	if (ctx[seen] && ctx[seen].includes(l)) return null

	const newSeen = ctx[seen] ? [...ctx[seen], l] : [l]
	return parseLocation({...ctx, [seen]: newSeen}, l, ...args)
}

module.exports = parseLocationWithoutCycles
