interface Context {
  ctx: Context;
  repository: Repository;
}

class Context {
  constructor(public ctx: Context, public repository: Repository) {}

  async load(aggregate: Aggregate): Promise<boolean> {
    return this.repository.load(this.ctx, aggregate);
  }

  async save(...aggregates: Aggregate[]): Promise<boolean> {
    return this.repository.save(this.ctx, ...aggregates);
  }

  apply(aggregate: Aggregate, change: AggregateChange) {
    applyAggregateChange(this.ctx, aggregate, change);
  }
}

function newContext(ctx: Context, repository: Repository): Context {
  return new Context(ctx, repository);
}

interface Repository {
  load(ctx: Context, aggregate: Aggregate): Promise<boolean>;
  save(ctx: Context, ...aggregates: Aggregate[]): Promise<boolean>;
}

interface Aggregate {}

interface AggregateChange {}

async function applyAggregateChange(
  ctx: Context,
  aggregate: Aggregate,
  change: AggregateChange
) {
  // apply change
}
