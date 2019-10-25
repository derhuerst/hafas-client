'use strict'

const parseWhen = (ctx, date, timeS, timeR, tzOffset, cncl = false) => {
	const {parsed, profile} = ctx
	const parse = profile.parseDateTime

	let planned = timeS ? parse(ctx, date, timeS, tzOffset, false) : null
	let prognosed = timeR ? parse(ctx, date, timeR, tzOffset, false) : null
	let delay = null

	if (planned && prognosed) {
		const tPlanned = parse(ctx, date, timeS, tzOffset, true)
		const tPrognosed = parse(ctx, date, timeR, tzOffset, true)
		delay = Math.round((tPrognosed - tPlanned) / 1000)
	}

	if (cncl) {
		return {
			...parsed,
			when: null,
			plannedWhen: planned,
			prognosedWhen: prognosed,
			delay
		}
	}
	return {
		...parsed,
		when: prognosed,
		plannedWhen: planned,
		delay
	}
}

module.exports = parseWhen
