'use strict'

const omit = require('lodash/omit')
// todo: get the original parseHint differently
const _parseHint = require('../parse/hint')

const parseHint = (ctx, hint) => {
	return _parseHint(ctx, {
		...omit(hint, ['value']),
		code: hint.key,
		txtN: hint.value
		// todo: map hint.routeIdxFrom & hint.routeIdxTo
	})
}

module.exports = parseHint
