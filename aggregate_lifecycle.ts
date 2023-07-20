import {Mutex, MutexInterface, Semaphore, SemaphoreInterface, withTimeout} from 'async-mutex';
import { DomainEvent } from './event';

type aggregateChange = any

class aggregateLifecycle {
	mutex        :Mutex
	domainEvents :DomainEvent[]

    constructor() {
        this.mutex = new Mutex();
        this.domainEvents = new Array
    }

    apply(agg :Aggregate, aggChange :aggregateChange) {
        this.mutex.acquire
        if (aggChange == undefined) {
            this.mutex.release()
            panic(errors.New("aggregate apply failed, aggregateChange is nil"))
            return
        }
        eventName = strings.TrimSpace(getAggregateChangeName(aggChange))
        if (eventName == "") {
            this.mutex.Unlock()
            panic(errors.New("aggregate apply failed, eventName is empty"))
            return
        }
        domainEvent = SampleDomainEvent{
            aggregateId:   agg.Identifier(),
            aggregateName: getAggregateName(agg),
            eventName:     eventName,
            eventBody:     aggChange,
        }
        domainEvent.initEventId()
        err := handleAppliedDomainEvent(agg, &domainEvent)
        if err != nil {
            this.mutex.Unlock()
            panic(errors.New("aggregate apply failed, apply domain event failed"))
            return
        }
        this.domainEvents = append(c.domainEvents, &domainEvent)
        this.mutex.Unlock()
        return
    }

    getDomainEvents() :DomainEvent[] {
        return this.domainEvents
    }

    cleanDomainEvents() {
        this.mutex.Lock()
        this.domainEvents = new DomainEvent[]
        this.mutex.Unlock()
    }

}

export {aggregateLifecycle, aggregateChange}