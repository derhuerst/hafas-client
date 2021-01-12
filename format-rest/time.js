'use strict'

const {DateTime, IANAZone} = require('luxon')

const timezones = new WeakMap()

const formatTime = (profile, when) => {
	let timezone
	if (timezones.has(profile)) timezone = timezones.get(profile)
	else {
		timezone = new IANAZone(profile.timezone)
		timezones.set(profile, timezone)
	}

	return DateTime.fromMillis(+when, {
		locale: profile.locale,
		zone: timezone
	}).toFormat('HH:mm:ss')
}

module.exports = formatTime
