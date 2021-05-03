# subscription-related methods

todo: explanation

```js
const {journeys} = await client.journeys(ludwigshafen, meckesheim, {
	results: 1, polylines: true,
})
const journey = journeys[0]
const channelId = 'some-channel'

const userId = await client.createSubscriptionsUser([channelId])
const subId = await client.subscribeToJourney(userId, [channelId], journey.refreshToken)

const sub = await client.subscription(userId, subId, {journey: true, activeDays: true})

await client.unsubscribe(userId, subId)
```

todo: API docs
