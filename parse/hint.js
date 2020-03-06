'use strict'

const codesByIcon = Object.assign(Object.create(null), {
	cancel: 'cancelled'
})

const linkTypesByCode = Object.assign(Object.create(null), {
	// IFOPT-based DHID
	// https://wiki.openstreetmap.org/wiki/DE:Key:ref:IFOPT
	// https://trid.trb.org/view/1435440
	IF: 'stop-dhid',
	// todo: `{type: 'I',code: 'TD',icoX: 1,txtN: '8010224'}`
	// todo: `{type: 'I',code: 'TE',icoX: 1,txtN: '8024001'}`
})

// todo: pass in tag list from hint reference, e.g.:
// "tagL": [
// 	"RES_JNY_H3" // H3 = level 3 heading? shown on overview
// ]
// "tagL": [
// 	"RES_JNY_DTL" // only shown in journey detail
// ]
// todo: https://github.com/public-transport/hafas-client/issues/5
const parseHint = (ctx, h) => {
	// todo: C

	if (h.type === 'I' && h.code && h.txtN) {
		if (h.code in linkTypesByCode) {
			return {type: linkTypesByCode[h.code], text: h.txtN}
		}
		if (h.code === 'TW' && h.txtN[0] === '#') {
			return {type: 'foreign-id', text: h.txtN.slice(1)}
		}
	}

	const text = h.txtN && h.txtN.trim() || ''
	const icon = h.icon || null
	const code = h.code || (icon && icon.type && codesByIcon[icon.type]) || null

	if (h.type === 'M') {
		return {
			type: 'status',
			summary: h.txtS && h.txtS.trim() || '',
			code,
			text
		}
	}

	if (h.type === 'L') {
		return {
			type: 'status',
			code: 'alternative-trip',
			text,
			tripId: h.jid
		}
	}
	if (h.type === 'A' || h.type === 'I') {
		return {
			type: 'hint',
			code,
			text
		}
	}

	if (
		h.type === 'D' || h.type === 'U' || h.type === 'R' || h.type === 'N' ||
		h.type === 'Y' || h.type === 'Q'
	) {
		// todo: how can we identify the individual types?
		// todo: does `D` mean "disturbance"?
		return {
			type: 'status',
			code,
			text
		}
	}

	return null
}

module.exports = parseHint
