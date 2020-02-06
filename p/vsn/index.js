'use strict'

const products = require('./products')

const transformReqBody = (ctx, body) => {
	body.client = {type: 'IPA', id: 'VSN', name: 'vsn', v: '5030100', os: 'iOS 13.3'}
	body.ver = '1.24'
	body.auth = {type: 'AID', aid: 'Mpf5UPC0DmzV8jkg'}
	body.lang = 'de'

	return body
}

const vsnProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	endpoint: 'https://fahrplaner.vsninfo.de/hafas/mgate.exe',

	// https://gist.github.com/n0emis/3b6887572793f4f54da9d83b30548332#file-haf_config_base-properties-L31
	// https://runkit.com/derhuerst/hafas-decrypt-encrypted-mac-salt
	salt: Buffer.from('535033316d4275665379434c6d4e7870', 'hex'),
	addMicMac: true,

	transformReqBody,

	products: products,

	trip: true,
	radar: true,
	refreshJourney: true,
	reachableFrom: true,

	departuresGetPasslist: false,
	departuresStbFltrEquiv: false
}

module.exports = vsnProfile
