import { v4 as uuid } from "uuid";

function NewDomainEventId(): string {
  return uuid();
}

interface DomainEvent {
  AggregateId(): number;
  AggregateName(): string;
  EventId(): number;
  EventName(): string;
  EventBody(): any;
  EventBodyRaw(): ArrayBuffer;
  EventCreateTime(): Date;
  initEventId(): void;
}

export { DomainEvent };
