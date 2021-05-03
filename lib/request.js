'use strict'

const DEV = process.env.NODE_ENV === 'dev'
const DEBUG = /(^|,)hafas-client(,|$)/.test(process.env.DEBUG || '')

const ProxyAgent = require('https-proxy-agent')
const {isIP} = require('net')
const {Agent: HttpsAgent} = require('https')
const roundRobin = require('@derhuerst/round-robin-scheduler')
const {randomBytes} = require('crypto')
const createHash = require('create-hash')
const pick = require('lodash/pick')
const captureStackTrace = DEV ? require('capture-stack-trace') : () => {}
const {stringify} = require('qs')
const Promise = require('pinkie-promise')
const {fetch} = require('fetch-ponyfill')({Promise})
const {parse: parseContentType} = require('content-type')
const {addErrorInfo} = require('./errors')

const proxyAddress = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null
const localAddresses = process.env.LOCAL_ADDRESS || null

if (proxyAddress && localAddresses) {
	console.error('Both env vars HTTPS_PROXY/HTTP_PROXY and LOCAL_ADDRESS are not supported.')
	process.exit(1)
}
let getAgent = () => null
if (proxyAddress) {
	const agent = new ProxyAgent(proxyAddress)
	getAgent = () => agent
} else if (localAddresses) {
	const agents = process.env.LOCAL_ADDRESS.split(',')
	.map((addr) => {
		const family = isIP(addr)
		if (family === 0) throw new Error('invalid local address:' + addr)
		return new HttpsAgent({addr, family})
	})
	const pool = roundRobin(agents)
	getAgent = () => pool.get()
}

const id = randomBytes(6).toString('hex')
const randomizeUserAgent = (userAgent) => {
	const i = Math.round(Math.random() * userAgent.length)
	return userAgent.slice(0, i) + id + userAgent.slice(i)
}

const md5 = input => createHash('md5').update(input).digest()

const request = (ctx, userAgent, reqData) => {
	const {profile, opt} = ctx

	const body = profile.transformReqBody(ctx, {
		// todo: is it `eng` actually?
		// RSAG has `deu` instead of `de`
		lang: opt.language || profile.defaultLanguage || 'en',
		svcReqL: [reqData]
	})
	Object.assign(body, pick(profile, [
		'client', // client identification
		'ext', // ?
		'ver', // HAFAS protocol version
		'auth', // static authentication
	]))
	if (DEBUG) console.error(JSON.stringify(body))

	const req = profile.transformReq(ctx, {
		agent: getAgent(),
		method: 'post',
		// todo: CORS? referrer policy?
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			'Accept-Encoding': 'gzip, br, deflate',
			'Accept': 'application/json',
			'user-agent': randomizeUserAgent(userAgent)
		},
		redirect: 'follow',
		query: {}
	})

	if (profile.addChecksum || profile.addMicMac) {
		if (!Buffer.isBuffer(profile.salt) && 'string' !== typeof profile.salt) {
			throw new TypeError('profile.salt must be a Buffer or a string.')
		}
		// Buffer.from(buf, 'hex') just returns buf
		const salt = Buffer.from(profile.salt, 'hex')

		if (profile.addChecksum) {
			const checksum = md5(Buffer.concat([
				Buffer.from(req.body, 'utf8'),
				salt,
			]))
			req.query.checksum = checksum.toString('hex')
		}
		if (profile.addMicMac) {
			const mic = md5(Buffer.from(req.body, 'utf8'))
			req.query.mic = mic.toString('hex')

			const micAsHex = Buffer.from(mic.toString('hex'), 'utf8')
			const mac = md5(Buffer.concat([micAsHex, salt]))
			req.query.mac = mac.toString('hex')
		}
	}

	const url = profile.endpoint + '?' + stringify(req.query)

	// Async stack traces are not supported everywhere yet, so we create our own.
	const err = new Error()
	err.isHafasError = true // todo: rename to `isHafasClientError`
	err.request = req.body // todo: commit as bugfix
	err.url = url
	captureStackTrace(err)

	return fetch(url, req)
	.then((res) => {
		err.statusCode = res.status
		if (!res.ok) {
			err.message = res.statusText
			throw err
		}

		let cType = res.headers.get('content-type')
		if (cType) {
			const {type} = parseContentType(cType)
			if (type !== 'application/json') {
				const err = new Error('invalid response content-type: ' + cType)
				err.response = res
				throw err
			}
		}
		return res.json()
	})
	.then((b) => {
		if (DEBUG) console.error(JSON.stringify(b))

		if (b.err && b.err !== 'OK') {
			addErrorInfo(err, b.err, b.errTxt, b.id)
			throw err
		}
		if (!b.svcResL || !b.svcResL[0]) {
			err.message = 'invalid response'
			throw err
		}
		if (b.svcResL[0].err !== 'OK') {
			addErrorInfo(err, b.svcResL[0].err, b.svcResL[0].errTxt, b.id)
			throw err
		}

		const res = b.svcResL[0].res

		// parse subscription API errors
		if (res.result && res.result.resultCode === 'ERROR') {
			addErrorInfo(err, res.result.externalError, res.result.internalError)
			throw err
		}

		return {
			res,
			common: profile.parseCommon({...ctx, res})
		}
	})
}

module.exports = request
