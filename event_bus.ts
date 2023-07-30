// EventHandle interface
interface EventHandle {
  (ctx: Context, event: DomainEvent): Promise<void>;
}

// EventBus interface
interface EventBus {
  name: string;

  send(ctx: Context, ...events: DomainEventMessage[]): Promise<void>;

  recv(ctx: Context, topic: string, handle: EventHandle): Promise<void>;

  start(ctx: Context): Promise<void>;

  shutdown(): void;

  await(): Promise<void>;

  close(ctx: Context): Promise<void>;
}

// DomainEventMessage interface
interface DomainEventMessage {
  aggregateId: number;
  aggregateName: string;
  eventName: string;
  eventId: number;
  eventBody: Buffer;

  topicName(eventBusName: string): string;

  decode(data: Buffer): Promise<void>;
}

// Implementation

class DomainEventMessage implements DomainEventMessage {
  constructor(
    public aggregateId: number,
    public aggregateName: string,
    public eventName: string,
    public eventId: number,
    public eventBody: Buffer
  ) {}

  topicName(eventBusName: string) {
    // ...
  }

  async decode(data: Buffer) {
    // ...
  }
}

async function newDomainEventMessage(
  event: DomainEvent
): Promise<DomainEventMessage> {
  const eventBody = await event.getEventBody();

  return new DomainEventMessage(
    event.getAggregateId(),
    event.getAggregateName(),
    event.getEventName(),
    event.getEventId(),
    eventBody
  );
}
