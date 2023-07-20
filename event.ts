import { v4 as uuid } from "uuid";

function NewDomainEventId(): string {
  return uuid();
}

class DomainEvent {
  aggregateId: string;
  aggregateName: string;
  eventId: string;
  eventName: string;
  eventData: {};

  constructor(
    aggregateId: string,
    aggregateName: string,
    eventName: string,
    eventData: {}
  ) {
    this.aggregateId = aggregateId;
    this.aggregateName = aggregateName;
    this.eventId = NewDomainEventId();
    this.eventName = eventName;
    this.eventData = eventData;
  }
}

export { DomainEvent };
