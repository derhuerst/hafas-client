# Writing a profile

**Per endpoint, `hafas-client` has an endpoint-specific customisation called *profile*** which may for example do the following:

- handle the additional requirements of the endpoint (e.g. authentication),
- extract additional information from the data provided by the endpoint,
- guard against triggering bugs of certain endpoints (e.g. time limits).

This guide is about writing such a profile. If you just want to use an already supported endpoint, refer to the [API documentation](readme.md) instead.

*Note*: **If you get stuck, ask for help by [creating an issue](https://github.com/public-transport/hafas-client/issues/new)!** We want to help people expand the scope of this library.

## 0. How do the profiles work?

A profile contains of three things:

- **mandatory details about the HAFAS endpoint**
	- `endpoint`: The protocol, host and path of the endpoint.
	- `locale`: The [BCP 47](https://en.wikipedia.org/wiki/IETF_language_tag) [locale](https://en.wikipedia.org/wiki/Locale_(computer_software)) of your endpoint (or the area that your endpoint covers).
	- `timezone`: An [IANA-time-zone](https://www.iana.org/time-zones)-compatible [timezone](https://en.wikipedia.org/wiki/Time_zone) of your endpoint.
- **flags indicating that features are supported by the endpoint** – e.g. `journeyRef`
- **methods overriding the [default profile](../lib/default-profile.js)**

As an example, let's say we have an [Austrian](https://en.wikipedia.org/wiki/Austria) endpoint:

```js
const myProfile = {
	endpoint: 'https://example.org/bin/mgate.exe',
	locale: 'de-AT',
	timezone: 'Europe/Vienna'
}
```

Assuming the endpoint returns all lines names prefixed with `foo `, We can strip them like this:

```js
// get the default line parser
const createParseLine = require('hafas-client/parse/line')

const createParseLineWithoutFoo = (profile, operators) => {
	const parseLine = createParseLine(profile, operators)

	// wrapper function with additional logic
	const parseLineWithoutFoo = (l) => {
		const line = parseLine(l)
		line.name = line.name.replace(/foo /g, '')
		return line
	}
	return parseLineWithoutFoo
}

profile.parseLine = createParseLineWithoutFoo
```

If you pass this profile into `hafas-client`, the `parseLine` method will override [the default one](../parse/line.js).

## 1. Setup

*Note*: There are many ways to find the required values. This way is rather easy and has worked for most of the apps that we've looked at so far.

1. **Get an iOS or Android device and download the "official" app** for the public transport provider that you want to build a profile for.
2. **Configure a [man-in-the-middle HTTP proxy](https://docs.mitmproxy.org/stable/concepts-howmitmproxyworks/)** like [mitmproxy](https://mitmproxy.org).
	- Configure your device to trust the self-signed SSL certificate, [as outlined in the mitmproxy docs](https://docs.mitmproxy.org/stable/concepts-certificates/).
	- *Note*: This method does not work if the app uses [public key pinning](https://en.wikipedia.org/wiki/HTTP_Public_Key_Pinning). In this case (the app won't be able to query data), please [create an issue](https://github.com/public-transport/hafas-client/issues/new), so we can discuss other techniques.
3. **Record requests of the app.**
	- [There's a video showing this step](https://stuff.jannisr.de/how-to-record-hafas-requests.mp4).
	- Make sure to cover all relevant sections of the app, e.g. "journeys", "departures", "live map". Better record more than less; You will regret not having enough information later on.
	- To help others in the future, post the requests (in their entirety!) on GitHub, e.g. in as format like [this](https://gist.github.com/derhuerst/5fa86ed5aec63645e5ae37e23e555886). This will also let us help you if you have any questions.

## 2. Basic profile

- **Identify the `endpoint`.** The protocol, host and path of the endpoint, *but not* the query string.
	- *Note*: **`hafas-client` for now only supports the interface providing JSON** (generated from XML), which is being used by the corresponding iOS/Android apps. It supports neither the JSONP, nor the XML, nor the HTML interface. If the endpoint does not end in `mgate.exe`, it mostly likely won't work.
- **Identify the `locale`.** Basically guess work; Use the date & time formats as an indicator.
- **Identify the `timezone`.** This may be tricky, a for example [Deutsche Bahn](https://en.wikipedia.org/wiki/Deutsche_Bahn) returns departures for Moscow as `+01:00` instead of `+03:00`.
- **Copy the authentication** and other meta fields, namely `ver`, `ext`, `client` and `lang`.
	- You can find these fields in the root of each request JSON. Check [a VBB request](https://gist.github.com/derhuerst/5fa86ed5aec63645e5ae37e23e555886#file-1-http-L13-L22) and [the corresponding VBB profile](https://github.com/public-transport/hafas-client/blob/6e61097687a37b60d53e767f2711466b80c5142c/p/vbb/index.js#L22-L29) for an example.
	- Add a function `transformReqBody(body)` to your profile, which assigns them to `body`.
	- Some profiles have a `checksum` parameter (like [here](https://gist.github.com/derhuerst/2a735268bd82a0a6779633f15dceba33#file-journey-details-1-http-L1)) or two `mic` & `mac` parameters (like [here](https://gist.github.com/derhuerst/5fa86ed5aec63645e5ae37e23e555886#file-1-http-L1)). If you see one of them in your requests, jump to [*Appendix A: checksum, mic, mac*](#appendix-a-checksum-mic-mac). Unfortunately, this is necessary to get the profile working.

## 3. Products

In `hafas-client`, there's a difference between the `mode` and the `product` field:

- The `mode` field describes the mode of transport in general. [Standardised by the *Friendly Public Transport Format* `1.0.1`](https://github.com/public-transport/friendly-public-transport-format/blob/1.0.1/spec/readme.md#modes), it is on purpose limited to a very small number of possible values, e.g. `train` or `bus`.
- The value for `product` relates to how a means of transport "works" *in local context*. Example: Even though [*S-Bahn*](https://en.wikipedia.org/wiki/Berlin_S-Bahn) and [*U-Bahn*](https://en.wikipedia.org/wiki/Berlin_U-Bahn) in Berlin are both `train`s, they have different operators, service patterns, stations and look different. Therefore, they are two distinct `product`s `subway` and `suburban`.

**Specify `product`s that appear in the app** you recorded requests of. For a fictional transit network, this may look like this:

```js
const products = {
	commuterTrain: {
		product: 'commuterTrain',
		mode: 'train',
		bitmask: 1,
		name: 'ACME Commuter Rail',
		short: 'CR'
	},
	metro: {
		product: 'metro',
		mode: 'train',
		bitmask: 2,
		name: 'Foo Bar Metro',
		short: 'M'
	}
}
```

Let's break this down:

- `product`: A sensible, [camelCased](https://en.wikipedia.org/wiki/Camel_case#Variations_and_synonyms), alphanumeric identifier. Use it for the key in the `products` object as well.
- `mode`: A [valid *Friendly Public Transport Format* `1.0.1` mode](https://github.com/public-transport/friendly-public-transport-format/blob/1.0.1/spec/readme.md#modes).
- `bitmask`: HAFAS endpoints work with a [bitmask](https://en.wikipedia.org/wiki/Mask_(computing)#Arguments_to_functions) that toggles the individual products. the value should toggle the appropriate bit(s) in the bitmask (see below).
- `name`: A short, but distinct name for the means of transport, *just precise enough in local context*, and in the local language. In Berlin, `S-Bahn-Schnellzug` would be too much, because everyone knows what `S-Bahn` means.
- `short`: The shortest possible symbol that identifies the product.

todo: `defaultProducts`, `allProducts`, `bitmasks`, add to profile

If you want, you can now **verify that the profile works**; We've prepared [a script](https://runkit.com/public-transport/hafas-client-profile-example/0.1.0) for that. Alternatively, [submit a Pull Request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/) and we will help you out with testing and improvements.

### Finding the right values for the `bitmask` field

As shown in [the video](https://stuff.jannisr.de/how-to-record-hafas-requests.mp4), search for a journey and toggle off one product at a time, recording the requests. After extracting the products bitmask ([example](https://gist.github.com/derhuerst/193ef489f8aa50c2343f8bf1f2a22069#file-via-http-L34)) you will end up with values looking like these:

```
toggles                     value  binary  subtraction     bit(s)
all products                31     11111   31 - 0
all but ACME Commuter Rail  15     01111   31 - 2^4        2^4
all but Foo Bar Metro       23     10111   31 - 2^3        2^3
all but product E           30     11001   31 - 2^2 - 2^1  2^2, 2^1
all but product F           253    11110   31 - 2^1        2^0
```

## 4. Additional info

We consider these improvements to be *optional*:

- **Check if the endpoint supports the journey legs call.**
	- In the app, check if you can query details for the status of a single journey leg. It should load realtime delays and the current progress.
	- If this feature is supported, add `journeyLeg: true` to the profile.
- **Check if the endpoint supports the live map call.** Does the app have a "live map" showing all vehicles within an area? If so, add `radar: true` to the profile.
-  **Consider transforming station & line names** into the formats that's most suitable for *local users*. Some examples:
	- `M13 (Tram)` -> `M13`. With Berlin context, it is obvious that `M13` is a tram.
	- `Berlin Jungfernheide Bhf` -> `Berlin Jungfernheide`. With local context, it's obvious that *Jungfernheide* is a train station.
- **Check if the endpoint has non-obvious limitations** and let use know about these. Examples:
	- Some endpoints have a time limit, after which they won't return more departures, but silently discard them.

---

## Appendix A: `checksum`, `mic`, `mac`

As far as we know, there are three different types of authentication used among HAFAS deployments.

### unprotected endpoints

You can just query these, as long as you send a formally correct request.

### endpoints using the `checksum` query parameter

`checksum` is a [message authentication code](https://en.wikipedia.org/wiki/Message_authentication_code): `hafas-client` will compute it by [hashing](https://en.wikipedia.org/wiki/Hash_function) the request body and a secret *salt*. **This secret can be read from the config file inside the app bundle.** There is no guide for this yet, so please [open an issue](https://github.com/public-transport/hafas-client/issues/new) instead.

### endpoints using the `mic` & `mac` query parameters

`mic` is a [message integrity code](https://en.wikipedia.org/wiki/Message_authentication_code), the [hash](https://en.wikipedia.org/wiki/Hash_function) of the request body.

`mac` is a [message authentication code](https://en.wikipedia.org/wiki/Message_authentication_code), the hash of `mic` and a secret *salt*. **This secret can be read from the config file inside the app bundle.** There is no guide for this yet, so please [open an issue](https://github.com/public-transport/hafas-client/issues/new) instead.
