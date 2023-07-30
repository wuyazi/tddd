// create table
function sqlCreateDomainEventTable(domainEventTableName: string) {
  return `create table if not exists ${domainEventTableName} (
		id bigint unsigned auto_increment primary key,
		aggregate_id bigint not null,
		event_id bigint not null,
		event_name varchar(50) not null,
		event_data text not null,
		unique index ix_aggregate_id (aggregate_id),
		unique index ix_event_id (event_id)
	)charset 'utf8mb4';`;
}
function sqlCreateDomainSnapshotTable(domainSnapshotTableName: string) {
  return `create table if not exists ${domainSnapshotTableName} (
		aggregate_id bigint not null primary key,
		last_event_id bigint not null,
		snapshot_data text not null
	)charset 'utf8mb4';`;
}
// events
function sqlInsertEventPrefix(domainEventTableName: string) {
  return `INSERT INTO ${domainEventTableName} (aggregate_id, event_id, event_name, event_data) VALUES `;
}
function sqlSelectEventsByAggregateId(domainEventTableName: string) {
  return `SELECT event_id, event_name, event_data FROM ${domainEventTableName} WHERE aggregate_id = ? ORDER BY id ASC`;
}
function sqlSelectEventsByAggregateIdAndEventId(domainEventTableName: string) {
  return `SELECT event_id, event_name, event_data FROM ${domainEventTableName} WHERE aggregate_id = ? AND id > (SELECT id FROM ${domainEventTableName} where event_id = ?) ORDER BY id ASC`;
}
function sqlGetLatestEventRowIdByAggregateId(domainEventTableName: string) {
  return `SELECT id FROM ${domainEventTableName} WHERE aggregate_id = ? ORDER BY id DESC LIMIT 1 OFFSET 0`;
}
function sqlGetEventRowIdByEventId(domainEventTableName: string) {
  return `SELECT id FROM ${domainEventTableName} WHERE event_id = ?`;
}
function sqlCountEventsByAggregateIdAndEventsIdRange(
  domainEventTableName: string
) {
  return `SELECT count(id) FROM ${domainEventTableName} WHERE aggregate_id = ? and id > ? and id <= ? ORDER BY id ASC`;
}
function sqlSelectEventsByAggregateIdAndEventsIdRange(
  domainEventTableName: string
) {
  return `SELECT event_id, event_name, event_data FROM ${domainEventTableName} WHERE aggregate_id = ? and id > ? and id <= ? ORDER BY id ASC`;
}
function sqlGetLastEventIdByAggregateId(domainEventTableName: string) {
  return `SELECT last_event_id FROM ${domainEventTableName} WHERE aggregate_id = ?`;
}
// snapshot
function sqlInsertOrUpdateSnapshot(domainSnapshotTableName: string) {
  return `INSERT INTO ${domainSnapshotTableName} (aggregate_id, last_event_id, snapshot_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE snapshot_data = ?`;
}
function sqlGetSnapshotDataByAggregateId(domainSnapshotTableName: string) {
  return `SELECT last_event_id, snapshot_data FROM ${domainSnapshotTableName} WHERE aggregate_id = ?`;
}
