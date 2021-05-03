'use strict'

const {DateTime, FixedOffsetZone, IANAZone} = require('luxon')

const timezones = new WeakMap()

const parseDateTime = ({profile}, date, time, tzOffset = null, timestamp = false) => {
	let timezone
	if (tzOffset !== null) {
		timezone = FixedOffsetZone.instance(tzOffset)
	} else if (timezones.has(profile)) {
		timezone = timezones.get(profile)
	} else {
		timezone = new IANAZone(profile.timezone)
		timezones.set(profile, timezone)
	}

	if (time && /\d{4}-\d{2}-\d{2}T/.test(time)) {
		const dt = DateTime.fromISO(time, {
			locale: profile.locale,
			zone: timezone,
		})
		if (!dt.invalid) {
			return timestamp ? dt.toMillis() : dt.toISO({suppressMilliseconds: true})
		}
	}

	const pDate = [date.substr(-8, 4), date.substr(-4, 2), date.substr(-2, 2)]
	if (!pDate[0] || !pDate[1] || !pDate[2]) {
		throw new Error('invalid date format: ' + date)
	}

	const pTime = [time.substr(-6, 2), time.substr(-4, 2), time.substr(-2, 2)]
	if (!pTime[0] || !pTime[1] || !pTime[2]) {
		throw new Error('invalid time format: ' + time)
	}

	const daysOffset = time.length > 6 ? parseInt(time.slice(0, -6)) : 0

	let dt = DateTime.fromISO(pDate.join('-') + 'T' + pTime.join(':'), {
		locale: profile.locale,
		zone: timezone
	})
	if (daysOffset > 0) dt = dt.plus({days: daysOffset})
	return timestamp ? dt.toMillis() : dt.toISO({suppressMilliseconds: true})
}

module.exports = parseDateTime
