'use strict'

const DEV = process.env.NODE_ENV === 'dev'
const DEBUG = /\bhafas-client\b/.test(process.env.DEBUG || '')

const createHash = require('create-hash')
const captureStackTrace = DEV ? require('capture-stack-trace') : () => {}
const {stringify} = require('qs')
const ProxyAgent = require('https-proxy-agent')
const Promise = require('pinkie-promise')
const {fetch} = require('fetch-ponyfill')({Promise})
const randomizeUserAgent = require('./randomize-user-agent')

const proxyAddress = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null
const proxyAgent = proxyAddress ? new ProxyAgent(proxyAddress) : null

const md5 = input => createHash('md5').update(input).digest()

const request = (ctx, userAgent, reqData) => {
	const {profile, opt} = ctx

	const addErrorInfo = (err, errorCode, errorText, responseId) => {
		if (profile.errors[errorCode]) {
			Object.assign(err, profile.errors[errorCode])
			if (errorCode) err.hafasErrorCode = errorCode
			if (errorText) err.hafasErrorMessage = errorText
		} else {
			err.code = errorCode || null
			err.message = errorText || errorCode || null
			err.responseId = responseId || null
		}
	}

	const body = profile.transformReqBody(ctx, {
		// todo: is it `eng` actually?
		// RSAG has `deu` instead of `de`
		lang: opt.language || 'en',
		svcReqL: [reqData]
	})
	if (DEBUG) console.error(JSON.stringify(body))

	const req = profile.transformReq(ctx, {
		agent: proxyAgent,
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
		if (!Buffer.isBuffer(profile.salt)) {
			throw new TypeError('profile.salt must be a Buffer.')
		}
		if (profile.addChecksum) {
			const checksum = md5(Buffer.concat([
				Buffer.from(req.body, 'utf8'),
				profile.salt
			]))
			req.query.checksum = checksum.toString('hex')
		}
		if (profile.addMicMac) {
			const mic = md5(Buffer.from(req.body, 'utf8'))
			req.query.mic = mic.toString('hex')

			const micAsHex = Buffer.from(mic.toString('hex'), 'utf8')
			const mac = md5(Buffer.concat([micAsHex, profile.salt]))
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
		return {
			res,
			common: profile.parseCommon({...ctx, res})
		}
	})
}

module.exports = request
