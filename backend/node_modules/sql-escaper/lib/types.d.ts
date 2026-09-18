export type Raw = {
    toSqlString(): string;
};
/** Avoids the global `Temporal` namespace so consumers don't need TS's ESNext.Temporal lib. */
export type TemporalValue = {
    readonly [Symbol.toStringTag]: `Temporal.${string}`;
    readonly epochMilliseconds?: number;
    toString(): string;
};
export type SqlValue = string | number | bigint | boolean | Date | TemporalValue | Buffer | Uint8Array | Raw | Record<string, unknown> | SqlValue[] | Set<SqlValue> | Map<string, SqlValue> | null | undefined;
export type Timezone = 'local' | 'Z' | (string & NonNullable<unknown>);
