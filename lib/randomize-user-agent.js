'use strict'

const {randomBytes} = require('crypto')

const id = randomBytes(6).toString('hex')
const randomizeUserAgent = (userAgent) => {
	const i = Math.round(Math.random() * userAgent.length)
	return userAgent.slice(0, i) + id + userAgent.slice(i)
}

module.exports = randomizeUserAgent
