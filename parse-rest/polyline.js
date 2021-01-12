'use strict'

const parsePolyline = (ctx, p) => {
	const coordinates = []
	for (let i = 0; i < p.crd.length; i += 2) {
		coordinates.push({
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Point',
				coordinates: [p.crd[i], p.crd[i + 1]]
			}
		})
	}

	return {
		type: 'FeatureCollection',
		features: coordinates
	}
}

module.exports = parsePolyline
