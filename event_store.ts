import mysql from "mysql";
import { DomainEvent } from "./event";
import { AbstractAggregate } from "./aggregate";

// e.g.: users_location_domain_events
function getDomainTableName(subDomainName: string, aggregateName: string, tableType: "events" | "snapshot"): string {
  return `${subDomainName}_${aggregateName}_domain_${tableType}`.toLowerCase();
}

class EventStore {
  subDomainName: string;
  conn: mysql.Connection;
  snapshotsChan: number; //chan Aggregate

  constructor(subDomainName: string) {
    this.subDomainName = subDomainName;
    this.conn = mysql.createConnection({
      host: "",
      user: "",
      password: "",
      database: "",
    });
    this.snapshotsChan = 0;
  }

  InitDomainEventStoreTable(aggregateName: string): Error | null {
    let subDomainName = this.subDomainName;
    let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
    let createEventSql = sqlCreateDomainEventTable(domainEventTableName);
    this.conn.query(createEventSql, function (createEventTableErr) {
      if (createEventTableErr != null) {
        return new Error(
          `mysql event store (${subDomainName}) create event table failed, aggregateName is ${aggregateName}, ${createEventTableErr}`
        );
      }
    });
    let domainSnapshotTableName = getDomainTableName(subDomainName, aggregateName, "snapshot");
    let createSnapshotSql = sqlCreateDomainSnapshotTable(domainSnapshotTableName);
    this.conn.query(createSnapshotSql, function (createSnapshotTableErr) {
      if (createSnapshotTableErr != null) {
        return new Error(
          `mysql event store (${subDomainName}) create snapshot table failed, aggregateName is ${aggregateName}, ${createSnapshotTableErr}`
        );
      }
    });
    return null;
  }

  ReadEvents(aggregateName: string, aggregateId: string, lastEventId: string): DomainEvent[] {
    let subDomainName = this.subDomainName;
    if (aggregateId == "") {
      throw new Error(`mysql event store (${subDomainName}) read events failed, aggregateId is empty`);
    }
    let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
    let listSQL: string = "";
    let listArgs: string[] = [];
    if (lastEventId == "") {
      let listSQL = sqlSelectEventsByAggregateId(domainEventTableName);
      listArgs.push(aggregateId);
    } else {
      let listSQL = sqlSelectEventsByAggregateIdAndEventId(domainEventTableName);
      listArgs.push(aggregateId, lastEventId);
    }
    let events: DomainEvent[] = [];
    this.conn.query(listSQL, listArgs, function (readEventsError, results) {
      if (readEventsError != null) {
        throw new Error(
          `mysql event store (${subDomainName}) read events failed, query failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, lastEventId is ${lastEventId}, ${readEventsError}`
        );
      }
      for (let result in results) {
        events.push(new DomainEvent(aggregateId, aggregateName, result[0], result[1], result[2]));
      }
    });
    return events;
  }

  StoreEvents(events: DomainEvent[]) {
    let subDomainName = this.subDomainName;
    let conn = this.conn;
    if (events == null || events.length == 0) {
      throw new Error(`mysql event store (${subDomainName}) store events failed, events is nil or empty`);
    }
    let sqlStmtMap = new Map<string, DomainEvent[]>();
    events.forEach((event, index) => {
      let aggregateName = event.aggregateId;
      if (aggregateName! in sqlStmtMap) {
        sqlStmtMap.set(aggregateName, []);
      }
      sqlStmtMap.get(aggregateName)!.push(event);
    });
    conn.beginTransaction();
    sqlStmtMap.forEach((events, aggregateName) => {
      let insertSQL: string = "";
      let sqlStmtArgs: any[] = [];
      let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
      insertSQL += sqlInsertEventPrefix(domainEventTableName);
      let insertSqlParam: string[] = [];
      events.forEach((event, index) => {
        insertSqlParam.push("(?, ?, ?, ?)");
        sqlStmtArgs.push([event.aggregateId, event.eventId, event.eventName, event.eventData]);
      });
      insertSQL += insertSqlParam.join(", ");
      conn.query(insertSQL, sqlStmtArgs, function (insertErr, results) {
        if (insertErr != null) {
          return conn.rollback(function () {});
          throw new Error(
            `mysql event store (${subDomainName}) store events failed, insert failed, aggregateName is ${aggregateName}, ${insertErr}`
          );
        }
      });
    });
    conn.commit((error) => {
      return conn.rollback(function () {});
    });
    return;
  }

  CheckEvents(events: DomainEvent[]) {
    let subDomainName = this.subDomainName;
    if (events == null || events.length == 0) {
      throw new Error(`mysql event store (${subDomainName}) check events failed, events is nil`);
    }
    events.forEach((event, index) => {
      let aggregateName = event.aggregateName;
      let rowId = this.getEventRowId(aggregateName, event.eventId);
      if (rowId == 0) {
        throw new Error(
          `mysql event store (${subDomainName}) check events failed, get rowId failed, rowId is 0, aggregateName is ${aggregateName}`
        );
      }
    });
    return;
  }

  getEventRowId(aggregateName: string, eventId: string): [number, Error | null] {
    let subDomainName = this.subDomainName;
    let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
    this.conn.query(sqlGetEventRowIdByEventId(domainEventTableName), eventId, function (queryErr, results) {
      if (queryErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) make snapshot failed, load row id from ${domainEventTableName} failed, eventId is ${eventId}, ${queryErr}`
        );
      }
      if (results.length > 0 && results[0].length > 0) {
        return [results[0][0], null];
      }
    });
    return [0, null];
  }

  getLatestEventRowIdOfAggregate(aggregateName: string, aggregateId: string): number {
    let subDomainName = this.subDomainName;
    let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
    this.conn.query(
      sqlGetLatestEventRowIdByAggregateId(domainEventTableName),
      aggregateId,
      function (queryErr, results) {
        if (queryErr != null) {
          throw new Error(
            `mysql event store (${subDomainName}) make snapshot failed, load latest event id of aggregate from ${domainEventTableName} failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, ${queryErr}`
          );
        }
        if (results.length > 0 && results[0].length > 0) {
          return results[0][0];
        }
      }
    );
    return 0;
  }

  // list >leftRowId, <=rightRowId stored events
  countStoredEvents(aggregateName: string, aggregateId: string, leftRowId: number, rightRowId: number): number {
    let subDomainName = this.subDomainName;
    if (aggregateId == "") {
      throw new Error(
        `mysql event store (${subDomainName}) count stored events failed, aggregateName is ${aggregateName}, aggregateId is empty`
      );
    }
    let domainEventTableName = getDomainTableName(subDomainName, aggregateName, "events");
    let listSQL = sqlCountEventsByAggregateIdAndEventsIdRange(domainEventTableName);
    this.conn.query(listSQL, [aggregateId, leftRowId, rightRowId], function (queryErr, results, fields) {
      if (queryErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) count stored events failed, query failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, leftRowId is ${leftRowId}, rightRowId is ${rightRowId}, ${queryErr}`
        );
      }
      if (results.length > 0 && results[0].length > 0) {
        return results[0][0];
      }
    });
    return 0;
  }

  // list >leftRowId, <=rightRowId stored events
  rangeStoredEvents(
    aggregateName: string,
    aggregateId: string,
    leftRowId: number,
    rightRowId: number
  ): [DomainEvent[], Error | null] {
    let subDomainName = this.subDomainName;
    if (aggregateId == "") {
      throw new Error(
        `mysql event store (${subDomainName}) range stored events failed, aggregateName is ${aggregateName}, aggregateId is empty`
      );
    }
    let domainEventTableName = getDomainTableName(this.subDomainName, aggregateName, "events");
    let listSQL = sqlSelectEventsByAggregateIdAndEventsIdRange(domainEventTableName);
    let events: DomainEvent[] = [];
    this.conn.query(listSQL, [aggregateId, leftRowId, rightRowId], function (queryErr, results, fields) {
      if (queryErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) range stored events failed, query failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, leftRowId is ${leftRowId}, rightRowId is ${rightRowId}, ${queryErr}`
        );
      }
      for (let result in results) {
        let event = new DomainEvent(aggregateId, aggregateName, result[0], result[1], result[2]);
        events.push(event);
      }
    });
    return [events, null];
  }

  MakeSnapshot(aggregate: AbstractAggregate) {
    let subDomainName = this.subDomainName;
    if (aggregate == null) {
      throw new Error(`mysql event store (${subDomainName}) make snapshot failed, aggregate is nil`);
    }
    if (aggregate.Id == "") {
      throw new Error(`mysql event store (${subDomainName}) make snapshot failed, aggregateId is nil`);
    }
    // todo: with lock
    this.doMakeSnapshot(aggregate);
    return;
  }

  async doMakeSnapshot(aggregate: AbstractAggregate) {
    let subDomainName = this.subDomainName;
    if (aggregate == null) {
      throw new Error(`mysql event store (${subDomainName}) make snapshot failed, aggregate is nil`);
    }
    if (aggregate.Id == "") {
      throw new Error(`mysql event store (${subDomainName}) make snapshot failed, aggregateId is nil`);
    }

    let aggregateName = aggregate.constructor.name;
    let [prevEventId, getPrevEventIdErr] = this.LoadSnapshot(aggregate.Id, aggregate);
    if (getPrevEventIdErr != null) {
      throw new Error(
        `mysql event store (${subDomainName}) make snapshot failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, ${getPrevEventIdErr}`
      );
    }
    let prevEventRowId: number = 0;
    let emptyAggregate: AbstractAggregate;
    if (prevEventId != "") {
      let [prevEventRowId0, getPrevEventRowIdErr] = this.getEventRowId(aggregateName, prevEventId);
      if (getPrevEventRowIdErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) make snapshot failed, aggregateName is ${aggregateName}, aggregateId is %d, %v`
        );
      }
      prevEventRowId = prevEventRowId0;
    } else {
      emptyAggregate = aggregate;
    }
    // count of not be made snapshot events
    let latestEventRowId = this.getLatestEventRowIdOfAggregate(aggregateName, aggregate.Id);
    if (latestEventRowId == 0) {
      throw new Error(
        `mysql event store (${subDomainName}) make snapshot failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, %v`
      );
    }
    let count = this.countStoredEvents(aggregateName, aggregate.Id, prevEventRowId, latestEventRowId);
    let makeFlag = count > 10;
    if (!makeFlag) {
      return;
    }

    // make
    // get not be made events (prevEventId:latestEventId]
    let [storedEvents, rangeStoredEventsErr] = this.rangeStoredEvents(
      aggregateName,
      aggregate.Id,
      prevEventRowId,
      latestEventRowId
    );
    if (rangeStoredEventsErr != null) {
      throw new Error(
        `mysql event store (${subDomainName}) make snapshot failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, %v`
      );
    }
    if (storedEvents == null || storedEvents.length == 0) {
      return;
    }

    let lastEventId = storedEvents[storedEvents.length - 1].eventId;
    let handleErr = handleStoredEventRecursively(emptyAggregate, storedEvents);
    if (handleErr != null) {
      throw new Error(
        `mysql event store (${subDomainName}) make snapshot failed, handle stored event recursively falied, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, %v`
      );
    }

    let aggregateBytes,
      encodeErr = json.Marshal(emptyAggregate);
    if (encodeErr != null) {
      throw new Error(
        `mysql event store (${subDomainName}) make snapshot failed, encode aggregate failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, lastEventId is ${lastEventId}, %v`
      );
    }
    let domainSnapshotTableName = getDomainTableName(subDomainName, aggregateName, "snapshot");
    let insertSQL = sqlInsertOrUpdateSnapshot(domainSnapshotTableName);
    let conn = this.conn;
    this.conn.beginTransaction(function (txErr) {
      if (txErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) make snapshot failed, begin database tx failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, lastEventId is ${lastEventId}, %v`
        );
      }
      conn.query(insertSQL, [aggregate.Id, lastEventId, aggregateBytes, aggregateBytes], function (insertErr, results) {
        if (insertErr != null) {
          conn.rollback();
          throw new Error(
            `mysql event store (${subDomainName}) make snapshot failed, insert failed, aggregateName is ${aggregateName}, aggregateId is ${aggregate.Id}, lastEventId is ${lastEventId}, %v`
          );
        }
        if (results.affectedRows == 0) {
          conn.rollback();
          throw new Error(
            "mysql event store (%s) make snapshot failed, insert failed, aggregateName is %s, aggregateId is %d, lastEventId is %d. no rows affected failed, affected = %v",
            es.subDomainName,
            aggregateName,
            aggregateId,
            lastEventId,
            affected
          );
        }
      });
    });
    return;
  }

  getLastEventIdFromSnapshot(aggregateName: string, aggregateId: string): string {
    let subDomainName = this.subDomainName;
    if (aggregateId == "") {
      throw new Error(
        `mysql event store (${subDomainName}) get last event id from snapshot failed, aggregateId is empty`
      );
    }
    let domainSnapshotTableName = getDomainTableName(subDomainName, aggregateName, "snapshot");
    let getSQL = sqlGetLastEventIdByAggregateId(domainSnapshotTableName);
    this.conn.query(getSQL, aggregateId, function (queryErr, results) {
      if (queryErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) get last event id from snapshot failed, query failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, ${queryErr}`
        );
      }
      if (results.length > 0 && results[0].length > 0) {
        return results[0][0];
      }
    });
    return "";
  }

  LoadSnapshot(aggregateId: string, emptyAggregate: AbstractAggregate): [string, Error | null] {
    let subDomainName = this.subDomainName;
    if (aggregateId == "") {
      throw new Error(`mysql event store (${subDomainName}) load snapshot failed, aggregateId is empty`);
    }
    if (emptyAggregate == null) {
      throw new Error(`mysql event store (${subDomainName}) load snapshot failed, aggregate is nil`);
    }
    let aggregateName = emptyAggregate.constructor.name;
    let domainSnapshotTableName = getDomainTableName(subDomainName, aggregateName, "snapshot");
    let getSQL = sqlGetSnapshotDataByAggregateId(domainSnapshotTableName);
    this.conn.query(getSQL, aggregateId, function (queryErr, results, fields) {
      if (queryErr != null) {
        throw new Error(
          `mysql event store (${subDomainName}) load snapshot failed, query failed, aggregateName is ${aggregateName}, aggregateId is ${aggregateId}, ${queryErr}`
        );
      }
      let lastEventId = results.last_event_id;
      if (lastEventId == "") {
        return lastEventId;
      }
      let snapshotData = results.snapshot_data;
      emptyAggregate.load(snapshotData);
    });
    return ["", null];
  }
}
