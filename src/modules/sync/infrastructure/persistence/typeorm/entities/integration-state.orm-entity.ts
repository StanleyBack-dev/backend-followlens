import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

// Single-row table (id = "instagram") holding the circuit breaker state.
@Entity("tb_integration_state")
export class IntegrationStateOrmEntity {
  @PrimaryColumn({ type: "varchar", length: 32 })
  id!: string;

  @Column({ type: "boolean", default: false })
  blocked!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: "blocked_at", type: "timestamptz", nullable: true })
  blockedAt!: Date | null;

  @Column({
    name: "session_fingerprint",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  sessionFingerprint!: string | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
