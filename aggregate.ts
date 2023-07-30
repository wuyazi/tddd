import { v4 as uuid } from "uuid";
import { DomainEvent } from "./event";

// todo mutex
// JavaScript is single-threaded (web-workers aside for a moment), nothing happens asynchronously (or everything for that matter) - all code: event handlers, timeouts, callbacks, etc. - run in the same thread, one after another.
// Thus you don't need any synchronization in JavaScript. Any given piece of code in JavaScript is guaranteed to be executed by only a single thread. How cool is that?

// todo nocopy

function NewAggregateId(): string {
  return uuid();
}

type aggregateChange = {};

abstract class AbstractAggregate {
  readonly Id: string;
  private domainEvents: DomainEvent[];

  constructor() {
    this.Id = NewAggregateId();
    this.domainEvents = [];
  }

  Apply(aggregateChange: aggregateChange) {
    let eventName = this.Apply.caller.name;
    if (eventName == "") {
      throw new Error("aggregate apply failed, eventName is empty");
    }
    const domainEvent = new DomainEvent(
      this.Id,
      this.constructor.name,
      NewAggregateId(),
      eventName,
      aggregateChange
    );
    let err = handleAppliedDomainEvent(agg, domainEvent);
    if (err != null) {
      throw new Error("aggregate apply failed, apply domain event failed");
    }
    this.domainEvents.push(domainEvent);
    return;
  }

  Applied(): DomainEvent[] {
    return this.domainEvents;
  }

  cleanDomainEvents() {
    this.domainEvents = [];
  }
}

export { AbstractAggregate };
