'use strict'

const Scanner = require('../lib/scanner')

const parseCommonData = (_ctx) => {
	const {profile, opt, res} = _ctx
	const c = res.common || {}
	const matches = Scanner(res, [
		'**.oprX', '**.icoX', '**.prodX', '**.pRefL', '**.locX',
		'**.ani.fLocX', '**.ani.tLocX', '**.fLocX', '**.tLocX',
		'**.remX', '**.himX', '**.polyG.polyXL'
	]);

	const common = {}
	const ctx = {..._ctx, common}

	common.operators = []
	if (Array.isArray(c.opL)) {
		common.operators = c.opL.map(op => profile.parseOperator(ctx, op))
		matches['**.oprX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].operator = common.operators[idx]
		})
	}

	common.icons = []
	if (Array.isArray(c.icoL)) {
		common.icons = c.icoL.map(icon => profile.parseIcon(ctx, icon))
		matches['**.icoX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].icon = common.icons[idx]
		})
	}

	common.lines = []
	if (Array.isArray(c.prodL)) {
		common.lines = c.prodL.map(l => profile.parseLine(ctx, l))

		matches['**.prodX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].line = common.lines[idx]
		})
		matches['**.pRefL'].forEach(([idxs, parents]) => {
			parents[0].lines = idxs.filter(idx => !!common.lines[idx]).map(idx => common.lines[idx])
		})
		// todo
		// **.dep.dProdX: departureLine -> common.lines[idx]
		// **.arr.aProdX: arrivalLine -> common.lines[idx]
	}

	common.locations = []
	if (Array.isArray(c.locL)) {
		common.locations = c.locL.map(loc => profile.parseLocation(ctx, loc))

		for (let i = 0; i < common.locations.length; i++) {
			const raw = c.locL[i]
			const loc = common.locations[i]
			if ('number' === typeof raw.mMastLocX) {
				loc.station = Object.assign({}, common.locations[raw.mMastLocX])
				loc.station.type = 'station'
			} else if (raw.isMainMast) loc.type = 'station'
		}

		// todo: correct props?
		matches['**.locX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].location = common.locations[idx]
		})
		matches['**.ani.fLocX'].forEach(([idxs, parents]) => {
			parents[0].fromLocations = idxs.map(idx => common.locations[idx])
		})
		matches['**.ani.tLocX'].forEach(([idxs, parents]) => {
			parents[0].toLocations = idxs.map(idx => common.locations[idx])
		})
		matches['**.fLocX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].fromLocation = common.locations[idx]
		})
		matches['**.tLocX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].toLocation = common.locations[idx]
		})
	}

	common.hints = []
	if (opt.remarks && Array.isArray(c.remL)) {
		common.hints = c.remL.map(hint => profile.parseHint(ctx, hint))
		matches['**.remX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].hint = common.hints[idx]
		})
	}
	common.warnings = []
	if (opt.remarks && Array.isArray(c.himL)) {
		common.warnings = c.himL.map(w => profile.parseWarning(ctx, w))
		matches['**.himX'].forEach(([idx, parents]) => {
			if ('number' === typeof idx) parents[0].warning = common.warnings[idx]
		})
	}

	common.polylines = []
	if (opt.polylines && Array.isArray(c.polyL)) {
		common.polylines = c.polyL.map(p => profile.parsePolyline(ctx, p))
		// todo: **.ani.poly -> parsePolyline()

		matches['**.polyG.polyXL'].forEach(([idxs, parents]) => {
			const idx = idxs.find(idx => !!common.polylines[idx]) // find any given polyline
			parents[1].polyline = common.polylines[idx]
		})
	}

	return common
}

module.exports = parseCommonData
