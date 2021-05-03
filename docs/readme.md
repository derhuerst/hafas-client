# API documentation

- [`journeys(from, to, [opt])`](journeys.md) – get journeys between locations
- [`refreshJourney(refreshToken, [opt])`](refresh-journey.md) – fetch up-to-date/more details of a `journey`
- [`journeysFromTrip(tripId, previousStopover, to, [opt])`](journeys-from-trip.md) – get journeys from a trip to a location
- [`trip(id, lineName, [opt])`](trip.md) – get details for a trip
- [`tripsByName(lineNameOrFahrtNr, [opt])`](trips-by-name.md) – get all trips matching a name
- [`departures(station, [opt])`](departures.md) – query the next departures at a station
- [`arrivals(station, [opt])`](arrivals.md) – query the next arrivals at a station
- [`locations(query, [opt])`](locations.md) – find stations, POIs and addresses
- [`stop(id, [opt])`](stop.md) – get details about a stop/station
- [`nearby(location, [opt])`](nearby.md) – show stations & POIs around
- [`radar(north, west, south, east, [opt])`](radar.md) – find all vehicles currently in a certain area
- [`reachableFrom(address, [opt])`](reachable-from.md) – get all stations reachable from an address within `n` minutes
- [`remarks([opt])`](remarks.md) – get all remarks
- [`lines(query, [opt])`](lines.md) – get all lines matching a name
- [`serverInfo([opt])`](server-info.md) – fetch meta information from HAFAS

## Migrating from an old `hafas-client` version

- [`4` → `5` migration guide](migrating-to-5.md)

## Throttling requests

There's opt-in support for throttling requests to the endpoint.

```js
const createClient = require('hafas-client')
const withThrottling = require('hafas-client/throttle')
const dbProfile = require('hafas-client/p/db')

// create a throttled HAFAS client with Deutsche Bahn profile
const client = createClient(withThrottling(dbProfile), 'my-awesome-program')

// Berlin Jungfernheide to München Hbf
client.journeys('8011167', '8000261', {results: 1})
.then(console.log)
.catch(console.error)
```

You can pass custom values for the nr of requests (`limit`) per interval into `withThrottling`:

```js
// 2 requests per second
const throttledDbProfile = withThrottling(dbProfile, 2, 1000)
const client = createClient(throttledDbProfile, 'my-awesome-program')
```

## Retrying failed requests

There's opt-in support for retrying failed requests to the endpoint.

```js
const createClient = require('hafas-client')
const withRetrying = require('hafas-client/retry')
const dbProfile = require('hafas-client/p/db')

// create a client with Deutsche Bahn profile that will retry on HAFAS errors
const client = createClient(withRetrying(dbProfile), 'my-awesome-program')

// Berlin Jungfernheide to München Hbf
client.journeys('8011167', '8000261', {results: 1})
.then(console.log)
.catch(console.error)
```

You can pass custom options into `withRetrying`. They will be passed into [`retry`](https://github.com/tim-kos/node-retry#tutorial).

```js
// retry 2 times, after 10 seconds & 30 seconds
const retryingDbProfile = withRetrying(dbProfile, {
	retries: 2,
	minTimeout: 10 * 1000,
	factor: 3
})
const client = createClient(retryingDbProfile, 'my-awesome-program')
```

## Writing a profile

Check [the guide](writing-a-profile.md).

## General documentation for `mgate.exe` APIs

[`hafas-mgate-api.md`](hafas-mgate-api.md)
