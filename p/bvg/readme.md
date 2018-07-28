# BVG profile for `hafas-client`

[*Verkehrsverbund Berlin-Brandenburg (BVG)*](https://en.wikipedia.org/wiki/Verkehrsverbund_Berlin-Brandenburg) is the major local transport provider in [Berlin](https://en.wikipedia.org/wiki/Berlin). This profile adds *BVG*-specific customizations to `hafas-client`.

## Usage

```js
const createClient = require('hafas-client')
const bvgProfile = require('hafas-client/p/bvg')

// create a client with BVG profile
const client = createClient(bvgProfile, 'my-awesome-program')
```


## Customisations

- parses *BVG*-specific products (such as *X-Bus*)
- strips parts from station names that are unnecessary in the Berlin context
- parses line names to give more information (e.g. "Is it an express bus?")
- renames *Ringbahn* line names to contain `⟳` and `⟲`
