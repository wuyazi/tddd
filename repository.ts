interface RepositorySaveListener {
  handle(ctx: Context, event: DomainEventMessage): void;
}

interface RepositoryConfig {
  domainName: string;
  subDomainName: string;
  eventBusNameServers: string[];
  saveListener: RepositorySaveListener;
  dbConf: DBConf;
}

class Repository {
  private eventStore: EventStore;
  private eventBus: EventBus;
  private saveListener?: RepositorySaveListener;

  constructor(ctx: Context, config: RepositoryConfig) {
    this.eventStore = new MySQLEventStore(ctx, {
      subDomainName: config.subDomainName,
      dbConfig: {
        dataSourceName: getDSN(config.dbConf),
      },
    });

    this.eventBus = new DTMEventBus(ctx, {
      domainName: config.domainName,
      subDomainName: config.subDomainName,
      nameServers: config.eventBusNameServers,
      eventStore: this.eventStore,
      dbConf: config.dbConf,
    });

    this.saveListener = config.saveListener;
  }

  async registerAggregates(ctx: Context, aggregates: Aggregate[]) {
    // ...
  }

  async load(ctx: Context, aggregate: Aggregate): Promise<boolean> {
    // ...
  }

  async save(ctx: Context, aggregates: Aggregate[]): Promise<void> {
    const events: DomainEventMessage[] = [];

    for (const aggregate of aggregates) {
      // validate

      const domainEvents = aggregate.getUncommittedEvents();

      await this.applyEvents(aggregate, domainEvents);

      for (const event of domainEvents) {
        const message = await eventToMessage(event);
        events.push(message);
      }

      aggregate.clearUncommittedEvents();

      // publish events
    }

    if (this.saveListener) {
      for (const event of events) {
        this.saveListener.handle(ctx, event);
      }
    }

    // save snapshots
  }
}
