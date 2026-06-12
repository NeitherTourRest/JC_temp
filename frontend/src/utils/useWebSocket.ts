import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

let client: Client | null = null
const subscriptions = new Map<string, StompSubscription>()

export function getWebSocketClient(): Client {
  if (!client || !client.connected) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    client = new Client({
      brokerURL: `${protocol}//${location.host}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[WS] Connected')
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected')
      },
    })
    client.activate()
  }
  return client
}

export function subscribeToTopic(topic: string, callback: (msg: IMessage) => void) {
  const c = getWebSocketClient()
  if (c.connected) {
    const sub = c.subscribe(topic, callback)
    subscriptions.set(topic, sub)
  } else {
    // Wait for connection then subscribe
    c.onConnect = () => {
      const sub = c.subscribe(topic, callback)
      subscriptions.set(topic, sub)
    }
  }
}

export function unsubscribe(topic: string) {
  const sub = subscriptions.get(topic)
  if (sub) {
    sub.unsubscribe()
    subscriptions.delete(topic)
  }
}

export function disconnect() {
  if (client) {
    client.deactivate()
    client = null
  }
}
