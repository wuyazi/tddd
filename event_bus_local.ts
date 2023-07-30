interface LocalEvent {
  topic: string;
  value: any;
}

class LocalEventBusGroups {
  private groups = new Map<string, LocalEvent[]>();
  private eventCounts = new Map<string, number>();

  addGroup(name: string, events: LocalEvent[]) {
    this.groups.set(name, events);
    this.eventCounts.set(name, 0);
  }

  removeGroup(name: string) {
    this.groups.delete(name);
    this.eventCounts.delete(name);
  }

  send(topic: string, event: any) {
    for (const [name, events] of this.groups) {
      const ev = { topic, value: event };
      events.push(ev);
      this.eventCounts.set(name, this.eventCounts.get(name)! + 1);
    }
  }
}

const eventBusGroups = new LocalEventBusGroups();

class LocalEventBus implements EventBus {
  private events: LocalEvent[] = [];
  private consumers = new Map<string, EventHandle>();

  constructor(public name: string) {
    eventBusGroups.addGroup(name, this.events);
  }

  send(ctx: Context, events: DomainEventMessage[]) {
    // send events
  }

  recv(ctx: Context, topic: string, handle: EventHandle) {
    // register handler
  }

  start(ctx: Context) {
    // start consuming events
  }

  shutdown() {
    // shutdown
  }

  await() {
    // await shutdown
  }

  close(ctx: Context) {
    // close
  }
}

function newLocalEventBus(name: string) {
  return new LocalEventBus(name);
}
