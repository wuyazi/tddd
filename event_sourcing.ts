import { Aggregate } from "./aggregate";
import { DomainEvent } from "./domain-event";
import { StoredEvent } from "./stored-event";

async function handleAppliedDomainEventsRecursively(
  aggregate: Aggregate,
  events: DomainEvent[]
): Promise<void> {
  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    await handleAppliedDomainEvent(aggregate, event);
  }
}

async function handleStoredEventsRecursively(
  aggregate: Aggregate,
  events: StoredEvent[]
): Promise<void> {
  if (!events || events.length === 0) {
    return;
  }

  const aggregateName = getAggregateName(aggregate);
  const aggregateId = aggregate.getId();

  for (const event of events) {
    const eventId = event.getEventId();
    if (eventId === 0) {
      throw new Error(
        `Event ID cannot be 0, Aggregate ${aggregateName} ${aggregateId}`
      );
    }

    const eventName = event.getEventName();
    if (!eventName) {
      throw new Error(
        `Event name cannot be empty, Aggregate ${aggregateName} ${aggregateId}`
      );
    }

    const eventBody = event.getEventBody();
    if (!eventBody) {
      throw new Error(
        `Event body cannot be null, Aggregate ${aggregateName} ${aggregateId}`
      );
    }

    await handleStoredEvent(aggregate, event);
  }
}

async function handleAppliedDomainEvent(
  aggregate: Aggregate,
  event: DomainEvent
): Promise<void> {
  // copy event body to aggregate
  aggregate.applyEvent(event);
}

async function handleStoredEvent(
  aggregate: Aggregate,
  event: StoredEvent
): Promise<void> {
  // deserialize event body onto aggregate
  aggregate.loadFromJSON(event.getEventBody());
}
