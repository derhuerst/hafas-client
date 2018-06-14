'use strict'

const createParseMovement = (profile, locations, lines, remarks, polylines = []) => {
	// todo: what is m.dirGeo? maybe the speed?
	// todo: what is m.stopL?
	// todo: what is m.proc? wut?
	// todo: what is m.pos?
	// todo: what is m.ani.dirGeo[n]? maybe the speed?
	// todo: what is m.ani.proc[n]? wut?
	const parseMovement = (m) => {
		const pStopover = profile.parseStopover(profile, locations, lines, remarks, m.date)

		const res = {
			direction: profile.parseStationName(m.dirTxt),
			journeyId: m.jid || null,
			trip: m.jid && +m.jid.split('|')[1] || null, // todo: this seems brittle
			line: lines[m.prodX] || null,
			location: m.pos ? {
				type: 'location',
				latitude: m.pos.y / 1000000,
				longitude: m.pos.x / 1000000
			} : null,
			nextStops: m.stopL.map(pStopover),
			frames: []
		}

		if (m.ani) {
			if (Array.isArray(m.ani.mSec)) {
				for (let i = 0; i < m.ani.mSec.length; i++) {
					res.frames.push({
						origin: locations[m.ani.fLocX[i]] || null,
						destination: locations[m.ani.tLocX[i]] || null,
						t: m.ani.mSec[i]
					})
				}
			}

			if (m.ani.poly && m.ani.poly.crdEncYX) {
				res.polyline = m.ani.poly.crdEncYX
			} else if (m.ani.polyG && Array.isArray(m.ani.polyG.polyXL)) {
				let p = m.ani.polyG.polyXL[0]
				// todo: there can be >1 polyline
				res.polyline = polylines[p] && polylines[p].crdEncYX || null
			}
		}

		return res
	}
	return parseMovement
}

module.exports = createParseMovement
