import { v4 as uuid } from "uuid";
import { aggregateChange, aggregateLifecycle } from "./aggregate_lifecycle";
import { DomainEvent } from "./event";

function NewAggregateId(): string {
  return uuid();
}

// function ApplyAggregateChange(aggregate: Aggregate, change: aggregateChange) {
//   aggregate.Apply(aggregate, change);
//   return;
// }

interface Aggregate {
  Apply(aggChange: aggregateChange): void;
  Applied(): DomainEvent[];
}

abstract class AbstractAggregate {
  Id: string; // todo: can not set outside
  private lifecycle: aggregateLifecycle;

  constructor() {
    this.Id = NewAggregateId();
    this.lifecycle = new aggregateLifecycle();
  }

  Apply(aggChange: aggregateChange) {
    this.lifecycle.apply(this, aggChange);
  }

  Applied(): DomainEvent[] {
    return this.lifecycle.getDomainEvents();
  }
}

export { Aggregate, AbstractAggregate };
