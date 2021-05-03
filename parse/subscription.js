'use strict'

const {gunzipSync} = require('zlib')

const parseSubscription = (ctx, id, s) => {
	const {profile, opt} = ctx

	const res = {
		id,
		hysteresis: s.hysteresis,
		monitorFlags: s.monitorFlags,
		connectionInfo: s.connectionInfo,
		journeyRefreshToken: s.ctxRecon,
	}

	if (opt.journey && s.data && s.data.slice(0, 5) === 'GZip:') {
		const gzipped = Buffer.from(s.data.slice(5), 'base64')
		const gunzipped = gunzipSync(gzipped)
		const {
			connection,
			// todo: version, search, cst, checksum
			// todo: reminderOrigin, reminderChange, reminderCheckout, reminderDestination
		} = JSON.parse(gunzipped.toString('utf8'))
		res.journey = profile.parseJourney(ctx, connection)
	}

	if (opt.activeDays && s.serviceDays) {
		// todo: move this somewhere else
		const {DateTime} = require('luxon')

		res.activeDays = Object.create(null)
		const days = s.serviceDays.selectedDays
		let d = DateTime.fromObject({
			zone: profile.timezone, locale: profile.locale,
			year: parseInt(s.serviceDays.beginDate.slice(0, 4)),
			month: parseInt(s.serviceDays.beginDate.slice(4, 6)),
			day: parseInt(s.serviceDays.beginDate.slice(6, 8)),
			hour: 0, minute: 0, second: 0, millisecond: 0
		})
		for (let b = 0; b < days.length; b++) {
			res.activeDays[d.toISODate()] = !!parseInt(days[b])
			d = d.plus({days: 1})
		}
	}

	return res
}

module.exports = parseSubscription
